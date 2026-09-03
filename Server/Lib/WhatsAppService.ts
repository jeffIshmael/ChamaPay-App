// Sends WhatsApp messages using Meta's WhatsApp Cloud API

export type WhatsAppSendResult = {
  success: boolean;
  error?: string;
};

function maskSecret(value: string | undefined): string {
  if (!value) return "(missing)";
  if (value.length <= 8) return `len=${value.length}`;
  return `len=${value.length} prefix=${value.slice(0, 4)}… suffix=…${value.slice(-4)}`;
}

/**
 * Send OTP via WhatsApp.
 * Prefer an approved authentication template when WHATSAPP_OTP_TEMPLATE is set;
 * otherwise fall back to a plain text body (sandbox / early setup).
 */
export async function sendWhatsAppOTP(
  toPhoneE164: string,
  otpCode: string
): Promise<WhatsAppSendResult> {
  try {
    const accessToken = process.env.WHATSAPP_TOKEN?.trim();
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
    const templateName = process.env.WHATSAPP_OTP_TEMPLATE?.trim(); // e.g. chamapay_otp
    const templateLang = process.env.WHATSAPP_OTP_TEMPLATE_LANG || "en";

    console.log("[WhatsApp OTP] send start", {
      toPhoneE164,
      phoneNumberId: phoneNumberId || "(missing)",
      token: maskSecret(accessToken),
      mode: templateName ? `template:${templateName}` : "text",
      templateLang: templateName ? templateLang : undefined,
      graphVersion: "v20.0",
    });

    if (!accessToken || !phoneNumberId) {
      console.error("[WhatsApp OTP] missing credentials", {
        hasToken: Boolean(accessToken),
        hasPhoneNumberId: Boolean(phoneNumberId),
      });
      return { success: false, error: "WhatsApp credentials not configured" };
    }

    const to = toPhoneE164.replace(/\D/g, "");
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const body = templateName
      ? {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: templateLang },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: otpCode }],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: otpCode }],
              },
            ],
          },
        }
      : {
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: {
            preview_url: false,
            body: `Your Chamapay verification code is ${otpCode}. It expires in 10 minutes.`,
          },
        };

    console.log("[WhatsApp OTP] Graph request", {
      url,
      to,
      type: body.type,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const resText = await res.text();
    console.log("[WhatsApp OTP] Graph response", {
      status: res.status,
      ok: res.ok,
      bodyPreview: resText.slice(0, 500),
    });

    if (!res.ok) {
      // If template send fails (e.g. button component mismatch), retry as text once
      if (templateName) {
        console.warn(
          "[WhatsApp OTP] template send failed; retrying as plain text"
        );
        const fallback = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: {
              preview_url: false,
              body: `Your Chamapay verification code is ${otpCode}. It expires in 10 minutes.`,
            },
          }),
        });
        const fbErr = await fallback.text();
        console.log("[WhatsApp OTP] text fallback response", {
          status: fallback.status,
          ok: fallback.ok,
          bodyPreview: fbErr.slice(0, 500),
        });
        if (fallback.ok) return { success: true };
        return {
          success: false,
          error: `WhatsApp API error: ${res.status} ${resText}; fallback: ${fbErr}`,
        };
      }
      return {
        success: false,
        error: `WhatsApp API error: ${res.status} ${resText}`,
      };
    }

    console.log("[WhatsApp OTP] send success", { to });
    return { success: true };
  } catch (error: unknown) {
    console.error("[WhatsApp OTP] unexpected error", error);
    return { success: false, error: (error as Error).message };
  }
}
