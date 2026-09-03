import { serverUrl } from "@/constants/serverUrl";

export type KycDocumentType = "NATIONAL_ID" | "PASSPORT" | "DRIVERS_LICENSE";

export type KycStatusResponse = {
  success: boolean;
  kycTier: number;
  kycStatus: string;
  kycVerifiedAt?: string | null;
  limitKes: number;
  mtdKes: number;
  remainingKes: number;
  tier1LimitKes: number;
  tier2LimitKes: number;
  sandbox: boolean;
  latestJob?: {
    jobId: string;
    documentType: string;
    status: string;
    createdAt: string;
  } | null;
  error?: string;
};

export type KycSessionResponse = {
  success: boolean;
  alreadyVerified?: boolean;
  jobId?: string;
  documentType?: string;
  countryCode?: string;
  partnerId?: string;
  sandbox?: boolean;
  smileParams?: Record<string, unknown>;
  message?: string;
  kycTier?: number;
  error?: string;
};

export async function getKycStatus(token: string): Promise<KycStatusResponse | null> {
  try {
    const response = await fetch(`${serverUrl}/kyc/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await response.json();
  } catch {
    return null;
  }
}

export async function createKycSession(
  token: string,
  documentType: KycDocumentType
): Promise<KycSessionResponse> {
  try {
    const response = await fetch(`${serverUrl}/kyc/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ documentType }),
    });
    return await response.json();
  } catch {
    return { success: false, error: "Failed to start verification" };
  }
}

export async function reportKycClientResult(
  token: string,
  jobId: string,
  resultRef?: string
) {
  try {
    const response = await fetch(`${serverUrl}/kyc/jobs/${jobId}/client-result`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ resultRef }),
    });
    return await response.json();
  } catch {
    return { success: false };
  }
}

export async function getKycJob(token: string, jobId: string) {
  try {
    const response = await fetch(`${serverUrl}/kyc/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await response.json();
  } catch {
    return null;
  }
}

/** Sandbox-only: approve without Smile provider. */
export async function sandboxApproveKyc(token: string, jobId: string) {
  try {
    const response = await fetch(`${serverUrl}/kyc/sandbox/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jobId }),
    });
    return await response.json();
  } catch {
    return { success: false, error: "Sandbox approve failed" };
  }
}

export const KYC_DOC_OPTIONS: {
  type: KycDocumentType;
  label: string;
  hint: string;
}[] = [
  {
    type: "NATIONAL_ID",
    label: "National ID",
    hint: "Kenya ID card (front and back)",
  },
  {
    type: "PASSPORT",
    label: "Passport",
    hint: "Photo page of your passport",
  },
  {
    type: "DRIVERS_LICENSE",
    label: "Driver's license",
    hint: "Kenya driving licence (front and back)",
  },
];
