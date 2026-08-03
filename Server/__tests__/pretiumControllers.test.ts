import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { initiatePretiumOnramp, pretiumCheckTriggerDepositFor } from "../Controllers/pretiumControllers";
import { pretiumOnramp, checkPretiumTxStatus } from "../Lib/PretiumFunctions";
import { pimlicoDepositForUser, pimlicoTransferToUser } from "../Lib/pimlicoAgent";
import { parseUnits } from "viem";

// Mock external modules
jest.mock("@coinbase/cdp-sdk", () => ({}));
jest.mock("ox", () => ({}));

jest.mock("@prisma/client", () => {
  const mPrismaClient = {
    user: {
      findUnique: jest.fn(),
    },
    pretiumTransaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    chamaBalance: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    }
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

jest.mock("../Lib/PretiumFunctions", () => ({
  pretiumOnramp: jest.fn(),
  checkPretiumTxStatus: jest.fn(),
  settlementAddress: "0xMockSettlementAddress",
}));

jest.mock("../Lib/pimlicoAgent", () => ({
  pimlicoDepositForUser: jest.fn(),
  pimlicoTransferToUser: jest.fn(),
}));

jest.mock("../Blockchain/erc20Functions", () => ({
  transferTx: jest.fn(),
}));

const prisma = new PrismaClient();

describe("FX Reserve Logic", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CHAMAPAY_RATE = "132"; // Set static FX rate

    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
  });

  describe("initiatePretiumOnramp", () => {
    it("should calculate exactUsdcAmount using CHAMAPAY_RATE and route funds to treasury", async () => {
      mockRequest = {
        body: {
          amount: "1320", // 1320 KES
          phoneNo: "0712345678",
          exchangeRate: 130, // Live exchange rate
          isDeposit: true,
          chamaId: 1,
        },
        user: { userId: 1 } as any,
      };

      (prisma.user.findUnique as any).mockResolvedValue({
        smartAddress: "0xUserSmartAddress",
      });

      (pretiumOnramp as any).mockResolvedValue({
        transaction_code: "TX123",
        message: "Success",
        status: "PENDING",
      });

      await initiatePretiumOnramp(mockRequest as Request, mockResponse as Response);

      // Verify routing to Treasury Address
      const treasuryAddress = "0x1C059486B99d6A2D9372827b70084fbfD014E978";
      expect(pretiumOnramp as any).toHaveBeenCalledWith("0712345678", "1320", treasuryAddress);

      // Verify correct USDC amount based on platform rate, not live rate
      const expectedUsdcAmount = 1320 / 132; // 10 USDC
      expect(prisma.pretiumTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cusdAmount: expectedUsdcAmount,
          }),
        })
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe("pretiumCheckTriggerDepositFor", () => {
    it("should credit the exact cusdAmount saved during onramp (not recalculating)", async () => {
      mockRequest = {
        body: {
          transactionCode: "TX123",
          chamaBlockchainId: 1,
          chamaId: 1,
          amount: "1320", // Input was KES
        },
        user: { userId: 1 } as any,
      };

      (prisma.user.findUnique as any).mockResolvedValue({
        smartAddress: "0xUserSmartAddress",
        userName: "testuser",
      });

      // The exact USDC amount calculated during onramp using the platform rate
      const exactUsdcAmount = 10; 

      (prisma.pretiumTransaction.findUnique as any).mockResolvedValue({
        transactionCode: "TX123",
        cusdAmount: exactUsdcAmount,
        amount: 1320,
        type: "payment",
      });

      (checkPretiumTxStatus as any).mockResolvedValue({
        is_released: true,
      });

      (pimlicoDepositForUser as any).mockResolvedValue("0xTxHash");

      await pretiumCheckTriggerDepositFor(mockRequest as Request, mockResponse as Response);

      // Should use the exactUsdcAmount directly, without calculating again
      const expectedBigintAmount = parseUnits(exactUsdcAmount.toString(), 6);
      
      expect(pimlicoDepositForUser).toHaveBeenCalledWith(
        1,
        "0xUserSmartAddress",
        expectedBigintAmount
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
