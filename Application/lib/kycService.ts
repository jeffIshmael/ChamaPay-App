import { serverUrl } from "@/constants/serverUrl";

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
  /** Didit Console sandbox application */
  sandbox: boolean;
  /** Offline mock (no Didit API) */
  localMock?: boolean;
  provider?: string;
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
  sessionId?: string;
  /** Pass to Didit RN SDK startVerification — never store permanently */
  sessionToken?: string | null;
  sandbox?: boolean;
  localMock?: boolean;
  sandboxScenario?: string | null;
  provider?: string;
  status?: string;
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

/** Start Didit session (document + liveness handled inside Didit UI). */
export async function createKycSession(token: string): Promise<KycSessionResponse> {
  try {
    const response = await fetch(`${serverUrl}/kyc/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    return await response.json();
  } catch {
    return { success: false, error: "Failed to start verification" };
  }
}

export async function reportKycClientResult(
  token: string,
  jobId: string,
  resultRef?: string,
  status?: string
) {
  try {
    const response = await fetch(`${serverUrl}/kyc/jobs/${jobId}/client-result`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ resultRef, status }),
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

/** Offline local-mock only: approve without Didit. Not for Didit Console sandbox. */
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
