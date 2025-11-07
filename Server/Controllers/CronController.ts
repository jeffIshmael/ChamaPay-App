import { checkStartDate, checkPaydate } from "../Utils/cronJobFunctions";
import { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const cronApiKey = process.env.CRON_API_KEY;
if (!cronApiKey) {
  throw new Error("CRON_API_KEY not configured");
}

export const cronController = async (req: Request, res: Response) => {
  try {
    // authenticate the request
    const authHeader: string | undefined = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: "Authorization required",
      });
    }
    const token: string = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token not provided",
      });
    }
    if (token !== cronApiKey) {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }
    // execute the cron jobs
    await checkStartDate();
    await checkPaydate();
    return res.status(200).json({
      success: true,
      message: "Cron jobs executed successfully",
    });
  } catch (error) {
    console.error("Cron jobs error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to execute cron jobs",
    });
  }
};
