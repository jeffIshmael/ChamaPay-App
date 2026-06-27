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
    };
    transactions: {
        total: number;
        last30Days: number;
    };
    mpesa: {
        deposits: number;
        withdrawals: number;
        volumeKes: number;
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
        paymentsLast30Days,
        payoutsLast30Days,
        pretiumLast30Days,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.payment.findMany({
            select: { amount: true, chamaId: true, doneAt: true },
        }),
        prisma.payOut.findMany({
            select: { amount: true, doneAt: true },
        }),
        prisma.pretiumTransaction.findMany({
            where: { status: "COMPLETE" },
            select: {
                amount: true,
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
        prisma.payment.count({ where: { doneAt: { gte: since30Days } } }),
        prisma.payOut.count({ where: { doneAt: { gte: since30Days } } }),
        prisma.pretiumTransaction.count({
            where: { status: "COMPLETE", createdAt: { gte: since30Days } },
        }),
    ]);

    const contributions = sumPaymentAmounts(
        payments.filter((payment) => payment.chamaId !== null)
    );
    const transfers = sumPaymentAmounts(
        payments.filter((payment) => payment.chamaId === null)
    );
    const payoutVolume = sumPaymentAmounts(payouts);

    const mpesaDeposits = pretiumTransactions.filter(
        (tx) => tx.isOnramp || tx.type === "deposit"
    );
    const mpesaWithdrawals = pretiumTransactions.filter(
        (tx) => !tx.isOnramp && tx.type !== "deposit"
    );

    const mpesaVolumeKes = pretiumTransactions.reduce(
        (total, tx) => total + Number(tx.amount),
        0
    );

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
            total: Math.round(contributions + payoutVolume + transfers),
            contributions: Math.round(contributions),
            payouts: Math.round(payoutVolume),
            transfers: Math.round(transfers),
        },
        transactions: {
            total: payments.length + payouts.length + pretiumTransactions.length,
            last30Days: paymentsLast30Days + payoutsLast30Days + pretiumLast30Days,
        },
        mpesa: {
            deposits: mpesaDeposits.length,
            withdrawals: mpesaWithdrawals.length,
            volumeKes: Math.round(mpesaVolumeKes),
        },
        updatedAt: new Date().toISOString(),
    };
};
