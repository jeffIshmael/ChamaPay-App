import { Router } from "express";
import { proxyPaymasterRpc } from "../Controllers/paymasterController";

const router = Router();

// POST /paymaster/rpc — JSON-RPC proxy for wallet_sendCalls paymasterService.url
router.post("/rpc", proxyPaymasterRpc);

export default router;
