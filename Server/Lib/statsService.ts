import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const THIRTY_DAYS_AGO = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const parseAmount = (value: string | null | undefined): number => {
    const parsed = parseFloat(value ?? "0");
    return Number.isFinite(parsed) ? parsed : 0;
};

const sumPaymentAmounts = (payments: { amount: string }[]): number =>
    payments.reduce((total, payment) => total + parseAmount(payment.amount), 0);

export type ChamapayStats = {
    downloads: {
        ios: number;
        android: number;
        total: number;
    };
    activeChamas: number;
    activeUsers: number;
    usdcVolume: {
        total: number;
        contributions: number;
        payouts: number;
        transfers: number;
        allocatedFunds: number;
    };
    transactions: {
        total: number;
        last30Days: number;
    };
    mpesa: {
        deposits: number;
        withdrawals: number;
        depositVolumeKes: number;
        withdrawalVolumeKes: number;
    };
    updatedAt: string;
};

export const getPlatformStats = async (): Promise<ChamapayStats> => {
    const since30Days = THIRTY_DAYS_AGO();

    const [
        totalUsers,
        payments,
        payouts,
        pretiumTransactions,
        activeChamaIds,
        activeUserIds,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.payment.findMany({
            select: { amount: true, chamaId: true, doneAt: true, receiver: true, sender: true, txHash: true, description: true },
        }),
        prisma.payOut.findMany({
            select: { amount: true, doneAt: true },
        }),
        prisma.pretiumTransaction.findMany({
            where: { status: "COMPLETE" },
            select: {
                amount: true,
                cusdAmount: true,
                isOnramp: true,
                type: true,
                createdAt: true,
            },
        }),
        prisma.payment.findMany({
            where: { doneAt: { gte: since30Days }, chamaId: { not: null } },
            select: { chamaId: true },
            distinct: ["chamaId"],
        }),
        prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(DISTINCT "userId")::bigint AS count FROM (
                SELECT "userId" FROM "Payment" WHERE "doneAt" >= ${since30Days}
                UNION
                SELECT "userId" FROM "PayOut" WHERE "doneAt" >= ${since30Days}
                UNION
                SELECT "userId" FROM "PretiumTransaction" WHERE "createdAt" >= ${since30Days}
            ) AS active_users
        `,
    ]);

    const contributions = sumPaymentAmounts(
        payments.filter((payment) => payment.chamaId !== null)
    );
    
    // Moonwell TVL = Deposits - Withdrawals
    const allocatedFundsDeposits = sumPaymentAmounts(
        payments.filter((payment) => payment.receiver === "Moonwell")
    );
    const allocatedFundsWithdrawals = sumPaymentAmounts(
        payments.filter((payment) => payment.sender === "Moonwell")
    );
    const allocatedFunds = Math.max(0, allocatedFundsDeposits - allocatedFundsWithdrawals);

    // Deduplicate Transfers (Peer-to-Peer sends generate 2 records, Webhook and internal transfer)
    const rawTransfers = payments.filter((payment) => payment.chamaId === null && payment.receiver !== "Moonwell" && payment.sender !== "Moonwell");
    const uniqueTransfers = [];
    const seenTxHashes = new Set();
    for (const payment of rawTransfers) {
        if (!payment.txHash || !seenTxHashes.has(payment.txHash)) {
            uniqueTransfers.push(payment);
            if (payment.txHash) seenTxHashes.add(payment.txHash);
        }
    }
    const transfers = sumPaymentAmounts(uniqueTransfers);

    const payoutVolume = sumPaymentAmounts(payouts);

    const mpesaDeposits = pretiumTransactions.filter((tx) => tx.isOnramp);
    const mpesaWithdrawals = pretiumTransactions.filter((tx) => !tx.isOnramp);

    const depositVolumeKes = mpesaDeposits.reduce(
        (total, tx) => total + Number(tx.amount),
        0
    );
    const withdrawalVolumeKes = mpesaWithdrawals.reduce(
        (total, tx) => total + Number(tx.amount),
        0
    );

    // Calculate TRUE EXTERNAL INFLOW (Total USDC Handled)
    // 1. M-Pesa Inflow (Sum of cusdAmount from all M-Pesa deposits)
    const mpesaUsdcInflow = mpesaDeposits.reduce(
        (total, tx) => total + (tx.cusdAmount ? Number(tx.cusdAmount) : Number(tx.amount) / 132), // fallback to rough estimate if cusdAmount is null
        0
    );

    // 2. External Crypto Inflow (Webhook receipts from external addresses)
    const transferPayments = payments.filter((p) => p.description === "Transfer");
    const receivedPayments = payments.filter((p) => p.description === "Received");
    const transferTxHashes = new Set(transferPayments.map(p => p.txHash));
    
    // An external inflow is a "Received" payment where the txHash is NOT in our internal transfers
    const externalCryptoInflows = receivedPayments.filter(p => !p.txHash || !transferTxHashes.has(p.txHash));
    const externalCryptoUsdcInflow = sumPaymentAmounts(externalCryptoInflows);

    const totalExternalUsdcInflow = mpesaUsdcInflow + externalCryptoUsdcInflow;

    // Deduplicate all payments to prevent double-counting of P2P and M-Pesa deposits
    const uniquePayments = [];
    const seenAllTxHashes = new Set();
    for (const payment of payments) {
        if (!payment.txHash || !seenAllTxHashes.has(payment.txHash)) {
            uniquePayments.push(payment);
            if (payment.txHash) seenAllTxHashes.add(payment.txHash);
        }
    }

    const uniquePaymentsLast30Days = uniquePayments.filter(p => new Date(p.doneAt) >= since30Days).length;
    const payoutsLast30DaysCount = payouts.filter(p => new Date(p.doneAt) >= since30Days).length;

    // Fetch Chama creations and Member additions counts
    const chamaCount = await prisma.chama.count();
    const chamaCountLast30Days = await prisma.chama.count({ where: { createdAt: { gte: since30Days } } });
    
    const chamaMemberCount = await prisma.chamaMember.count();
    const chamaMemberCountLast30Days = await prisma.chamaMember.count({ where: { payDate: { gte: since30Days } } });

    const iosDownloads = Number(process.env.STATS_IOS_DOWNLOADS ?? 0);
    const androidDownloads = Number(process.env.STATS_ANDROID_DOWNLOADS ?? 0);
    const downloadsTotal =
        iosDownloads + androidDownloads > 0
            ? iosDownloads + androidDownloads
            : totalUsers;

    return {
        downloads: {
            ios: iosDownloads,
            android: androidDownloads,
            total: downloadsTotal,
        },
        activeChamas: activeChamaIds.length,
        activeUsers: Number(activeUserIds[0]?.count ?? 0),
        usdcVolume: {
            total: Math.round(totalExternalUsdcInflow),
            contributions: Math.round(contributions),
            payouts: Math.round(payoutVolume),
            transfers: Math.round(transfers),
            allocatedFunds: Math.round(allocatedFunds),
        },
        transactions: {
            total: uniquePayments.length + payouts.length + chamaCount + chamaMemberCount,
            last30Days: uniquePaymentsLast30Days + payoutsLast30DaysCount + chamaCountLast30Days + chamaMemberCountLast30Days,
        },
        mpesa: {
            deposits: mpesaDeposits.length,
            withdrawals: mpesaWithdrawals.length,
            depositVolumeKes: Math.round(depositVolumeKes),
            withdrawalVolumeKes: Math.round(withdrawalVolumeKes),
        },
        updatedAt: new Date().toISOString(),
    };
};
