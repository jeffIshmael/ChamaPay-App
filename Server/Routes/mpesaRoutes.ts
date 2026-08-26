/**
 * Daraja callback routes for the FX test harness.
 * Paths match CallBackURL / ResultURL values hardcoded in Lib/MpesaFunctions.ts.
 */
import { Router, Request, Response } from "express";
import type { Hex } from "viem";
import {
  parseStkPushCallback,
  parseB2CCallback,
  parseAccountBalanceCallback,
  parseTransactionStatusCallback,
} from "../Lib/MpesaFunctions";
import { settleOrder, refundOrder } from "../Lib/EscrowFunctions";
import {
  getFxTestByCheckoutRequestId,
  getFxTestByOriginatorConversationId,
  updateFxTestStatus,
} from "../Lib/FxTestStore";

const router = Router();

function ack(_req: Request, res: Response): void {
  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
}

async function settleOrRefund(
  orderId: Hex,
  success: boolean,
  meta: {
    description?: string;
    mpesaReceipt?: string;
  }
): Promise<void> {
  try {
    if (success) {
      console.log("[mpesa callback] settling", { orderId, ...meta });
      const hash = await settleOrder(orderId);
      updateFxTestStatus(orderId, "SETTLED", {
        settleTxHash: hash,
        mpesaReceipt: meta.mpesaReceipt,
      });
      console.log("[mpesa callback] settled", { orderId, hash });
    } else {
      console.log("[mpesa callback] refunding", { orderId, ...meta });
      const hash = await refundOrder(orderId);
      updateFxTestStatus(orderId, "REFUNDED", {
        refundTxHash: hash,
        lastError: meta.description || "M-Pesa leg failed",
      });
      console.log("[mpesa callback] refunded", { orderId, hash });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mpesa callback] settle/refund failed", {
      orderId,
      success,
      error: message,
    });
    updateFxTestStatus(orderId, "FAILED", { lastError: message });
  }
}

/** STK Push result — ONRAMP fiat confirmation. POST /mpesa/stk/callback */
router.post("/stk/callback", async (req: Request, res: Response) => {
  console.log("[mpesa] STK callback:", JSON.stringify(req.body));
  ack(req, res);

  try {
    const parsed = parseStkPushCallback(req.body);
    console.log("[mpesa] STK parsed:", parsed);

    if (!parsed.checkoutRequestId) {
      console.warn("[mpesa] STK callback missing checkoutRequestId");
      return;
    }

    const record = getFxTestByCheckoutRequestId(parsed.checkoutRequestId);
    if (!record) {
      console.warn(
        "[mpesa] No FX test record for CheckoutRequestID",
        parsed.checkoutRequestId
      );
      return;
    }

    await settleOrRefund(record.orderId, parsed.success, {
      description: parsed.description,
      mpesaReceipt: parsed.mpesaReceiptNumber,
    });
  } catch (err) {
    console.error("[mpesa] STK callback handler error:", err);
  }
});

/** B2C result — OFFRAMP fiat confirmation. POST /mpesa/b2c/result */
router.post("/b2c/result", async (req: Request, res: Response) => {
  console.log("[mpesa] B2C result:", JSON.stringify(req.body));
  ack(req, res);

  try {
    const parsed = parseB2CCallback(req.body);
    console.log("[mpesa] B2C parsed:", parsed);

    if (!parsed.originatorConversationId) {
      console.warn("[mpesa] B2C result missing originatorConversationId");
      return;
    }

    const record = getFxTestByOriginatorConversationId(
      parsed.originatorConversationId
    );
    if (!record) {
      console.warn(
        "[mpesa] No FX test record for OriginatorConversationID",
        parsed.originatorConversationId
      );
      return;
    }

    await settleOrRefund(record.orderId, parsed.success, {
      description: parsed.description,
      mpesaReceipt:
        parsed.details?.transactionReceipt || parsed.transactionId,
    });
  } catch (err) {
    console.error("[mpesa] B2C result handler error:", err);
  }
});

/** B2C queue timeout — treat as failure → refund. POST /mpesa/b2c/timeout */
router.post("/b2c/timeout", async (req: Request, res: Response) => {
  console.log("[mpesa] B2C timeout:", JSON.stringify(req.body));
  ack(req, res);

  try {
    const parsed = parseB2CCallback(req.body);
    const record = parsed.originatorConversationId
      ? getFxTestByOriginatorConversationId(parsed.originatorConversationId)
      : null;

    if (!record) {
      console.warn("[mpesa] B2C timeout — no matching FX test record");
      return;
    }

    await settleOrRefund(record.orderId, false, {
      description: parsed.description || "B2C queue timeout",
    });
  } catch (err) {
    console.error("[mpesa] B2C timeout handler error:", err);
  }
});

/** Account balance result. POST /mpesa/result */
router.post("/result", (req: Request, res: Response) => {
  console.log("[mpesa] balance/result:", JSON.stringify(req.body));
  try {
    const parsed = parseAccountBalanceCallback(req.body);
    console.log("[mpesa] account balance parsed:", parsed);
    const kesLow = Number(process.env.FX_KES_LOW_WATERMARK || "20000");
    if (parsed.success && parsed.balances) {
      for (const bal of parsed.balances) {
        if (bal.availableBalance < kesLow) {
          console.warn(
            `⚠️ WARNING: M-Pesa ${bal.accountType} available ${bal.availableBalance} is below KES ${kesLow}`
          );
        }
      }
    }
  } catch (err) {
    console.error("[mpesa] balance result parse error:", err);
  }
  ack(req, res);
});

/** Generic queue timeout. POST /mpesa/timeout */
router.post("/timeout", (req: Request, res: Response) => {
  console.warn("[mpesa] timeout:", JSON.stringify(req.body));
  ack(req, res);
});

/** Transaction status result. POST /mpesa/transaction-status/result */
router.post("/transaction-status/result", (req: Request, res: Response) => {
  console.log("[mpesa] tx-status result:", JSON.stringify(req.body));
  try {
    console.log(
      "[mpesa] tx-status parsed:",
      parseTransactionStatusCallback(req.body)
    );
  } catch (err) {
    console.error("[mpesa] tx-status parse error:", err);
  }
  ack(req, res);
});

router.post("/transaction-status/timeout", (req: Request, res: Response) => {
  console.warn("[mpesa] tx-status timeout:", JSON.stringify(req.body));
  ack(req, res);
});

export default router;
