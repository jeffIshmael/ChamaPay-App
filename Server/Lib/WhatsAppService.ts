// Utils/WhatsAppService.ts
// Sends WhatsApp messages using Meta's WhatsApp Cloud API

export type WhatsAppSendResult = {
  success: boolean;
  error?: string;
};

export async function sendWhatsAppOTP(toPhoneE164: string, otpCode: string): Promise<WhatsAppSendResult> {
  try {
    const accessToken = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return { success: false, error: "WhatsApp credentials not configured" };
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const body = {
      messaging_product: "whatsapp",
      to: toPhoneE164,
      type: "text",
      text: {
        preview_url: false,
        body: `Your ChamaPay verification code is ${otpCode}. It expires in 10 minutes.`,
      },
    } as const;

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
      return { success: false, error: `WhatsApp API error: ${res.status} ${errText}` };
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}



