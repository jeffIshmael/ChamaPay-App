import { Request, Response } from "express";
import { getPlatformStats } from "../Lib/statsService";

export const getStats = async (_req: Request, res: Response) => {
    try {
        const stats = await getPlatformStats();
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.status(200).json(stats);
    } catch (error) {
        console.error("Failed to fetch platform stats:", error);
        return res.status(500).json({ error: "Stats temporarily unavailable" });
    }
};
