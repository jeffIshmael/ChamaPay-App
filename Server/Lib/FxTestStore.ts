/**
 * In-memory order mapping for the FX M-Pesa ↔ Escrow test harness.
 * Maps Daraja ids (CheckoutRequestID / OriginatorConversationID) to escrow order state.
 */
import type { Address, Hex } from "viem";
import { ORDER_STATUS_LABELS } from "./EscrowFunctions";

export type FxTestFlow = "ONRAMP" | "OFFRAMP";

export type FxTestLocalStatus =
  | "CREATED"
  | "ESCROWED"
  | "STK_PENDING"
  | "B2C_PENDING"
  | "SETTLED"
  | "REFUNDED"
  | "FAILED";

export interface FxTestRecord {
  orderId: Hex;
  flow: FxTestFlow;
  user: Address;
  phone: string;
  kesAmount: number;
  usdcAmount: string;
  usdcAmountRaw: string;
  localStatus: FxTestLocalStatus;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  originatorConversationId?: string;
  conversationId?: string;
  mpesaReceipt?: string;
  lastError?: string;
  createTxHash?: string;
  escrowTxHash?: string;
  settleTxHash?: string;
  refundTxHash?: string;
  createdAt: string;
  updatedAt: string;
}

const byOrderId = new Map<string, FxTestRecord>();
const byCheckoutRequestId = new Map<string, string>();
const byOriginatorConversationId = new Map<string, string>();

function touch(record: FxTestRecord): FxTestRecord {
  record.updatedAt = new Date().toISOString();
  return record;
}

function logTransition(
  record: FxTestRecord,
  from: FxTestLocalStatus | undefined,
  to: FxTestLocalStatus,
  extra?: Record<string, unknown>
) {
  console.log("[FxTestStore] status", {
    orderId: record.orderId,
    flow: record.flow,
    from,
    to,
    ...extra,
  });
}

export function saveFxTestRecord(record: FxTestRecord): FxTestRecord {
  const existing = byOrderId.get(record.orderId);
  byOrderId.set(record.orderId, touch(record));
  if (record.checkoutRequestId) {
    byCheckoutRequestId.set(record.checkoutRequestId, record.orderId);
  }
  if (record.originatorConversationId) {
    byOriginatorConversationId.set(
      record.originatorConversationId,
      record.orderId
    );
  }
  if (!existing) {
    console.log("[FxTestStore] created", {
      orderId: record.orderId,
      flow: record.flow,
      user: record.user,
      kesAmount: record.kesAmount,
      usdcAmount: record.usdcAmount,
    });
  }
  return record;
}

export function updateFxTestStatus(
  orderId: string,
  status: FxTestLocalStatus,
  patch?: Partial<FxTestRecord>
): FxTestRecord | null {
  const record = byOrderId.get(orderId);
  if (!record) {
    console.warn("[FxTestStore] update missed — unknown orderId", orderId);
    return null;
  }
  const from = record.localStatus;
  Object.assign(record, patch);
  record.localStatus = status;
  touch(record);
  if (record.checkoutRequestId) {
    byCheckoutRequestId.set(record.checkoutRequestId, record.orderId);
  }
  if (record.originatorConversationId) {
    byOriginatorConversationId.set(
      record.originatorConversationId,
      record.orderId
    );
  }
  logTransition(record, from, status, patch);
  return record;
}

export function getFxTestByOrderId(orderId: string): FxTestRecord | null {
  return byOrderId.get(orderId) ?? null;
}

export function getFxTestByCheckoutRequestId(
  checkoutRequestId: string
): FxTestRecord | null {
  const orderId = byCheckoutRequestId.get(checkoutRequestId);
  if (!orderId) return null;
  return byOrderId.get(orderId) ?? null;
}

export function getFxTestByOriginatorConversationId(
  originatorConversationId: string
): FxTestRecord | null {
  const orderId = byOriginatorConversationId.get(originatorConversationId);
  if (!orderId) return null;
  return byOrderId.get(orderId) ?? null;
}

export function listFxTestRecords(): FxTestRecord[] {
  return Array.from(byOrderId.values()).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );
}

export function onChainStatusLabel(status: number): string {
  return ORDER_STATUS_LABELS[status] ?? `UNKNOWN(${status})`;
}
