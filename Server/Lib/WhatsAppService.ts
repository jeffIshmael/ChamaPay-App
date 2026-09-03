// Sends WhatsApp messages using Meta's WhatsApp Cloud API

export type WhatsAppSendResult = {
  success: boolean;
  error?: string;
};

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
    const accessToken = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const templateName = process.env.WHATSAPP_OTP_TEMPLATE; // e.g. chamapay_otp
    const templateLang = process.env.WHATSAPP_OTP_TEMPLATE_LANG || "en";

    if (!accessToken || !phoneNumberId) {
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

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      // If template send fails (e.g. button component mismatch), retry as text once
      if (templateName) {
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
        if (fallback.ok) return { success: true };
        const fbErr = await fallback.text();
        return {
          success: false,
          error: `WhatsApp API error: ${res.status} ${errText}; fallback: ${fbErr}`,
        };
      }
      return { success: false, error: `WhatsApp API error: ${res.status} ${errText}` };
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}
