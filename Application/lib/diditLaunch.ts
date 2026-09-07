/**
 * Launch Didit native verification UI with a session token.
 * Shared so Verify Identity can open Didit immediately without an intermediate screen.
 */
export async function launchDiditVerification(sessionToken: string): Promise<{
  type: "completed" | "cancelled" | "failed";
  status?: string;
  errorMessage?: string;
}> {
  // Optional until a native rebuild links the module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const didit = require("@didit-protocol/sdk-react-native");
  const startVerification = didit.startVerification as (
    token: string
  ) => Promise<{
    type: "completed" | "cancelled" | "failed";
    session?: { status?: string };
    error?: { message?: string };
  }>;

  if (typeof startVerification !== "function") {
    throw new Error("Didit SDK startVerification is unavailable");
  }

  const result = await startVerification(sessionToken);

  if (result.type === "cancelled") {
    return { type: "cancelled" };
  }
  if (result.type === "failed") {
    return {
      type: "failed",
      errorMessage: result.error?.message || "Verification failed to start",
    };
  }

  return {
    type: "completed",
    status: result.session?.status,
  };
}
