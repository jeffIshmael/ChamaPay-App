// this has the functions for pretium apis
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

import {
  getQuote,
  pretiumOfframp,
  pretiumOnramp,
  verifyPhoneNo,
} from "../Lib/PretiumFunctions";

const prisma = new PrismaClient();

export async function getExchangeRate(req: Request, res: Response) {
  try {
    const { currencyCode } = req.params;
    const exchangeRate = await getQuote(currencyCode);
    return res.status(200).json({
      success: true,
      currencyCode: currencyCode,
      exchangeRate: exchangeRate,
    });
  } catch (error) {
    console.log("error in the exchange rate controller", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}

export async function initiatePretiumOnramp(req: Request, res: Response) {
  const { amount, phoneNo } = req.body;
  const userId = req.user?.userId;
  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    // Get user's wallet address
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smartAddress: true },
    });

    if (!user || !user.smartAddress) {
      return res.status(400).json({
        success: false,
        error: "User wallet address not found",
      });
    }

    // Note: the phone number should be '07....'
    if (!amount || !phoneNo) {
      return res.status(400).json({
        success: false,
        error: "Amount and phone number are required",
      });
    }
    // according to pretium docs: if you plan on adding a 1% fees, let the additional fee be included in the amount
    // for chamapay, we only charge 0.5% fee- the amount coming will be plus the fee
    const additionalFee = (Number(amount) * 100) / 100.5;

    const onRamp = await pretiumOnramp(
      phoneNo,
      amount,
      additionalFee,
      user.smartAddress
    );
    return res.status(200).json({
      success: true,
      result: onRamp,
    });
  } catch (error) {
    console.log("error in the onramping pretium", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}

export async function initiatePretiumOfframp(req: Request, res: Response) {
  const { amount, phoneNo, txHash } = req.body;
  const userId = req.user?.userId;
  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    // Get user's wallet address
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smartAddress: true },
    });

    if (!user || !user.smartAddress) {
      return res.status(400).json({
        success: false,
        error: "User wallet address not found",
      });
    }

    // Note: the phone number should be '07....'
    if (!amount || !phoneNo) {
      return res.status(400).json({
        success: false,
        error: "Amount and phone number are required",
      });
    }
    // according to pretium docs: if you plan on adding a 1% fees, let the additional fee be included in the amount
    // for chamapay, we only charge 0.5% fee- the amount coming will be plus the fee

    const offRamp = await pretiumOfframp(phoneNo, amount, 0, txHash);
    return res.status(200).json({
      success: true,
      result: offRamp,
    });
  } catch (error) {
    console.log("error in the offramping pretium", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}

export async function pretiumVerifyNumber(req: Request, res: Response) {
  const { phoneNo } = req.query;
  console.log("the phone number", phoneNo);
  try {
    // Note: the phone number should be '07....'
    if (!phoneNo) {
      return res.status(400).json({
        success: false,
        error: "phone number is required",
      });
    }

    const numberDetails = await verifyPhoneNo(phoneNo as string);
    return res.status(200).json({
      success: true,
      details: numberDetails,
    });
  } catch (error) {
    console.log("error in checking phone number", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}
// route to handle the pretium callback
export const pretiumCallback = async (req: Request, res: Response) => {
  console.log("=== Pretium Callback Received ===");
  console.log(JSON.stringify(req.body, null, 2));

  // Acknowledge immediately
  res.status(200).json({
    ResultCode: 0,
    ResultDesc: "Accepted",
  });

  try {
    const { Body } = req.body;
    const { stkCallback } = Body || {};

    console.log("The pretium callback result is", Body);
    console.log("the stkCallback", stkCallback);
  } catch (error) {
    console.error("Error processing callback:", error);
  }
};
