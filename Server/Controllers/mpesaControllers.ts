import { Request, Response } from "express";
import {
  checkMpesaTxStatus,
  tillPushStk,
  checkPushStatus,
} from "../Lib/MpesaFunctions";

export const mpesaTransaction = async (req: Request, res: Response) => {
  const { amount, phoneNo } = req.body;
  const userId = req.user?.userId;

  console.log("amount", amount);
  console.log("Phone number", phoneNo);
  try {
    if (!userId) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }
    const result = await tillPushStk(amount, phoneNo);
    if (!result) {
      res.status(500).json({ success: false, error: "Unable to push stk." });
    }
    if (result?.ResponseCode !== 0) {
      // this means the user has cancelled the transaction
      res.status(500).json({ success: false, error: result?.CustomerMessage });
    }

    // lets query the response once more
    const statusResult = await checkPushStatus(result?.CheckoutRequestID!);
    if (!statusResult) {
      res.status(500).json({ success: false, error: "Unable to push stk." });
    }
    if (statusResult?.ResponseCode !== 0) {
      // this means the user has cancelled the transaction
      res.status(500).json({ success: false, error: statusResult?.ResultDesc });
    }

    res.status(201).json({
      success: true,
      result,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: "Failed to create chama" });
  }
};
