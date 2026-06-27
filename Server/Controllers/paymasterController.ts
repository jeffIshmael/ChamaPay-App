import { Request, Response } from "express";

/**
 * Proxies ERC-7677 paymaster / bundler JSON-RPC to Coinbase CDP.
 * Recommended by Base docs so the CDP URL is not exposed in the mobile app.
 * https://docs.base.org/base-account/improve-ux/sponsor-gas/paymasters
 */
export const proxyPaymasterRpc = async (req: Request, res: Response) => {
    const paymasterUrl = process.env.COINBASE_PAYMASTER_URL;
    if (!paymasterUrl) {
        return res.status(500).json({
            jsonrpc: "2.0",
            id: req.body?.id ?? null,
            error: { code: -32603, message: "Paymaster URL is not configured" },
        });
    }

    try {
        const upstream = await fetch(paymasterUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body),
        });

        const payload = await upstream.json();
        return res.status(upstream.status).json(payload);
    } catch (error) {
        console.error("Paymaster proxy error:", error);
        return res.status(502).json({
            jsonrpc: "2.0",
            id: req.body?.id ?? null,
            error: { code: -32603, message: "Paymaster proxy request failed" },
        });
    }
};
