/**
 * FX test driver routes (gated by FX_TEST_ENABLED=true).
 * Orchestrates Escrow (Base Sepolia) + M-Pesa sandbox for onramp/offramp.
 */
import { Router, Request, Response, NextFunction } from "express";
import {
  keccak256,
  stringToHex,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import {
  initiateStkPush,
  sendB2CPayment,
  checkBalance,
} from "../Lib/MpesaFunctions";
import {
  OrderType,
  createOrder,
  escrowFunds,
  ensureAllowance,
  settleOrder,
  refundOrder,
  getOrder,
  getEscrowAddress,
  getAgentWallet,
  getTreasuryWallet,
  getTestUserWallet,
  parseUsdc,
  formatUsdc,
  dumpFxBalances,
  ORDER_STATUS_LABELS,
} from "../Lib/EscrowFunctions";
import {
  saveFxTestRecord,
  getFxTestByOrderId,
  updateFxTestStatus,
  listFxTestRecords,
  onChainStatusLabel,
  type FxTestRecord,
} from "../Lib/FxTestStore";

const router = Router();

function requireFxTestEnabled(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (process.env.FX_TEST_ENABLED !== "true") {
    res.status(403).json({
      error:
        "FX test harness disabled. Set FX_TEST_ENABLED=true in Server .env to use these routes.",
    });
    return;
  }
  next();
}

router.use(requireFxTestEnabled);

function getRate(): number {
  const rate = Number(process.env.CHAMAPAY_RATE || "132");
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Invalid CHAMAPAY_RATE");
  }
  return rate;
}

function makeOrderId(seed: string): Hex {
  return keccak256(stringToHex(seed));
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * POST /fx-test/onramp/start
 * body: { phone, kesAmount, userAddress? }
 */
router.post("/onramp/start", async (req: Request, res: Response) => {
  try {
    const phone = String(req.body.phone || "");
    const kesAmount = Number(req.body.kesAmount);
    const userAddress = (req.body.userAddress ||
      getTestUserWallet().account.address) as Address;

    if (!phone || !Number.isFinite(kesAmount) || kesAmount <= 0) {
      res.status(400).json({ error: "phone and positive kesAmount required" });
      return;
    }
    if (!isAddress(userAddress)) {
      res.status(400).json({ error: "Invalid userAddress" });
      return;
    }

    const rate = getRate();
    const usdcHuman = Number((kesAmount / rate).toFixed(6));
    const usdcAmountRaw = parseUsdc(usdcHuman);
    const orderId = makeOrderId(
      `onramp-${userAddress}-${kesAmount}-${Date.now()}-${Math.random()}`
    );
    const messageHash = `fx-onramp-${Date.now()}`;

    console.log("[fx-test] ONRAMP start", {
      phone,
      kesAmount,
      usdcHuman,
      userAddress,
      orderId,
      escrow: getEscrowAddress(),
    });

    await dumpFxBalances(userAddress);

    const createTxHash = await createOrder({
      orderId,
      user: userAddress,
      amount: usdcAmountRaw,
      orderType: OrderType.ONRAMP,
      messageHash,
    });

    const treasury = getTreasuryWallet().account.address;
    const escrow = getEscrowAddress();
    await ensureAllowance({
      privateKeyEnv: "TREASURY_PRIVATE_KEY",
      owner: treasury,
      spender: escrow,
      amount: usdcAmountRaw,
    });

    const escrowTxHash = await escrowFunds({
      orderId,
      callerPrivateKeyEnv: "TREASURY_PRIVATE_KEY",
    });

    const record: FxTestRecord = {
      orderId,
      flow: "ONRAMP",
      user: userAddress,
      phone,
      kesAmount,
      usdcAmount: formatUsdc(usdcAmountRaw),
      usdcAmountRaw: usdcAmountRaw.toString(),
      localStatus: "ESCROWED",
      createTxHash,
      escrowTxHash,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    saveFxTestRecord(record);

    const stk = await initiateStkPush({
      amount: Math.round(kesAmount),
      phoneNumber: phone,
      accountReference: `ON${orderId.slice(2, 10)}`,
      transactionDesc: "ChamaPay FX onramp",
    });

    if (!stk || !("CheckoutRequestID" in stk) || stk.ResponseCode !== "0") {
      console.error("[fx-test] STK push failed:", stk);
      const refundTxHash = await refundOrder(orderId);
      updateFxTestStatus(orderId, "FAILED", {
        lastError: `STK push failed: ${JSON.stringify(stk)}`,
        refundTxHash,
      });
      res.status(502).json({
        error: "STK push failed",
        orderId,
        stk,
        refundTxHash,
      });
      return;
    }

    updateFxTestStatus(orderId, "STK_PENDING", {
      checkoutRequestId: stk.CheckoutRequestID,
      merchantRequestId: stk.MerchantRequestID,
    });

    res.status(200).json({
      ok: true,
      flow: "ONRAMP",
      orderId,
      kesAmount,
      usdcAmount: formatUsdc(usdcAmountRaw),
      userAddress,
      createTxHash,
      escrowTxHash,
      checkoutRequestId: stk.CheckoutRequestID,
      merchantRequestId: stk.MerchantRequestID,
      customerMessage: stk.CustomerMessage,
      note: "Complete STK on the phone. Watch /mpesa/stk/callback logs for settle/refund.",
    });
  } catch (err) {
    console.error("[fx-test] onramp/start error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * POST /fx-test/offramp/start
 * body: { phone, usdcAmount, userAddress? }
 */
router.post("/offramp/start", async (req: Request, res: Response) => {
  try {
    const phone = String(req.body.phone || "");
    const usdcHuman = Number(req.body.usdcAmount);
    const userAddress = (req.body.userAddress ||
      getTestUserWallet().account.address) as Address;

    if (!phone || !Number.isFinite(usdcHuman) || usdcHuman <= 0) {
      res.status(400).json({ error: "phone and positive usdcAmount required" });
      return;
    }
    if (!isAddress(userAddress)) {
      res.status(400).json({ error: "Invalid userAddress" });
      return;
    }

    const rate = getRate();
    const kesAmount = Math.round(usdcHuman * rate);
    const usdcAmountRaw = parseUsdc(usdcHuman);
    const orderId = makeOrderId(
      `offramp-${userAddress}-${usdcHuman}-${Date.now()}-${Math.random()}`
    );
    const originatorConversationId = `FXOFF${Date.now()}`;
    const messageHash = `fx-offramp-${Date.now()}`;

    console.log("[fx-test] OFFRAMP start", {
      phone,
      usdcHuman,
      kesAmount,
      userAddress,
      orderId,
    });

    await dumpFxBalances(userAddress);

    const createTxHash = await createOrder({
      orderId,
      user: userAddress,
      amount: usdcAmountRaw,
      orderType: OrderType.OFFRAMP,
      messageHash,
    });

    const escrow = getEscrowAddress();
    const testUser = getTestUserWallet().account.address;
    if (userAddress.toLowerCase() !== testUser.toLowerCase()) {
      res.status(400).json({
        error:
          "For offramp tests, userAddress must match TEST_USER_PRIVATE_KEY address so we can approve/escrow.",
        expected: testUser,
        got: userAddress,
      });
      return;
    }

    await ensureAllowance({
      privateKeyEnv: "TEST_USER_PRIVATE_KEY",
      owner: userAddress,
      spender: escrow,
      amount: usdcAmountRaw,
    });

    const escrowTxHash = await escrowFunds({
      orderId,
      callerPrivateKeyEnv: "TEST_USER_PRIVATE_KEY",
    });

    const record: FxTestRecord = {
      orderId,
      flow: "OFFRAMP",
      user: userAddress,
      phone,
      kesAmount,
      usdcAmount: formatUsdc(usdcAmountRaw),
      usdcAmountRaw: usdcAmountRaw.toString(),
      localStatus: "ESCROWED",
      createTxHash,
      escrowTxHash,
      originatorConversationId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    saveFxTestRecord(record);

    const b2c = await sendB2CPayment({
      amount: kesAmount,
      phoneNumber: phone,
      remarks: "ChamaPay FX offramp",
      occasion: "FXOfframp",
      originatorConversationId,
    });

    if (!b2c || !("ConversationID" in b2c) || b2c.ResponseCode !== "0") {
      console.error("[fx-test] B2C failed:", b2c);
      const refundTxHash = await refundOrder(orderId);
      updateFxTestStatus(orderId, "FAILED", {
        lastError: `B2C failed: ${JSON.stringify(b2c)}`,
        refundTxHash,
      });
      res.status(502).json({
        error: "B2C payment failed",
        orderId,
        b2c,
        refundTxHash,
      });
      return;
    }

    updateFxTestStatus(orderId, "B2C_PENDING", {
      conversationId: b2c.ConversationID,
      originatorConversationId:
        b2c.OriginatorConversationID || originatorConversationId,
    });

    res.status(200).json({
      ok: true,
      flow: "OFFRAMP",
      orderId,
      kesAmount,
      usdcAmount: formatUsdc(usdcAmountRaw),
      userAddress,
      createTxHash,
      escrowTxHash,
      conversationId: b2c.ConversationID,
      originatorConversationId:
        b2c.OriginatorConversationID || originatorConversationId,
      note: "Watch /mpesa/b2c/result logs for settle/refund.",
    });
  } catch (err) {
    console.error("[fx-test] offramp/start error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/** GET /fx-test/order/:orderId */
router.get("/order/:orderId", async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId as Hex;
    const memory = getFxTestByOrderId(orderId);
    const onChain = await getOrder(orderId);

    res.status(200).json({
      orderId,
      memory,
      onChain: {
        orderId: onChain.orderId,
        user: onChain.user,
        token: onChain.token,
        amount: onChain.amount.toString(),
        orderType: onChain.orderType,
        orderTypeLabel:
          onChain.orderType === OrderType.ONRAMP ? "ONRAMP" : "OFFRAMP",
        status: onChain.status,
        statusLabel: onChainStatusLabel(onChain.status),
        messageHash: onChain.messageHash,
      },
    });
  } catch (err) {
    console.error("[fx-test] order status error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/** GET /fx-test/orders */
router.get("/orders", (_req: Request, res: Response) => {
  res.status(200).json({ orders: listFxTestRecords() });
});

/**
 * GET /fx-test/balances
 * Optional query: ?user=0x...
 */
router.get("/balances", async (req: Request, res: Response) => {
  try {
    const userParam = req.query.user as string | undefined;
    const user = (
      userParam && isAddress(userParam)
        ? userParam
        : getTestUserWallet().account.address
    ) as Address;

    const chain = await dumpFxBalances(user);

    let mpesaBalanceQueued: unknown = null;
    try {
      mpesaBalanceQueued = await checkBalance();
      console.log(
        "[fx-test] M-Pesa balance query queued (result via /mpesa/result):",
        mpesaBalanceQueued
      );
    } catch (err) {
      console.warn("[fx-test] M-Pesa balance query skipped/failed:", err);
    }

    res.status(200).json({
      chain,
      mpesaBalanceQueued,
      agentLocal: getAgentWallet().account.address,
      treasuryLocal: getTreasuryWallet().account.address,
      testUserLocal: getTestUserWallet().account.address,
      statusLabels: ORDER_STATUS_LABELS,
    });
  } catch (err) {
    console.error("[fx-test] balances error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/** Manual settle (debug) */
router.post("/order/:orderId/settle", async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId as Hex;
    const hash = await settleOrder(orderId);
    updateFxTestStatus(orderId, "SETTLED", { settleTxHash: hash });
    res.status(200).json({ ok: true, orderId, settleTxHash: hash });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/** Manual refund (debug) */
router.post("/order/:orderId/refund", async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId as Hex;
    const hash = await refundOrder(orderId);
    updateFxTestStatus(orderId, "REFUNDED", { refundTxHash: hash });
    res.status(200).json({ ok: true, orderId, refundTxHash: hash });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
