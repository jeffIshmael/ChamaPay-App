// Chamapay email design system, v2 (inspired by clean, minimal product emails).
//
// Layout: plain white page, no outer card or grey background, left-aligned,
// small logo + wordmark at the top, generous spacing, hairline borders,
// quiet footer. Teal is only used for the button, the logo and small accents.
//
// Kept in its own file so existing emails that use the old helpers don't change.
// Use it with:  import * as v2 from "./emailV2";

export const BRAND = "#1a6b6b"; // Chamapay teal
export const INK = "#171717"; // headings, strong text
export const TEXT = "#404040"; // body text
export const MUTED = "#737373"; // secondary text
export const BORDER = "#EAEAEA"; // hairlines
export const SURFACE = "#FAFAFA"; // very light panel fill
export const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const MONO =
  "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

// TODO: replace with your real, publicly hosted logo URL (PNG, ~96x96px)
export const LOGO_URL = "https://chamapay.xyz/images/logo.png";

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export function heading(text: string): string {
  return `<h1 style="margin:0 0 24px 0; font-family:${FONT}; font-size:26px; font-weight:600; line-height:1.25; letter-spacing:-0.5px; color:${INK};">${text}</h1>`;
}

export function subheading(text: string): string {
  return `<h2 style="margin:8px 0 14px 0; font-family:${FONT}; font-size:17px; font-weight:600; line-height:1.4; color:${INK};">${text}</h2>`;
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 20px 0; font-family:${FONT}; font-size:16px; line-height:1.65; color:${TEXT};">${html}</p>`;
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

/**
 * Bordered summary card. Optional title row (with a teal tick) sits above the
 * rows, separated by a hairline. Values are escaped here, so pass raw strings.
 */
export function detailsCard(
  rows: { label: string; value: string; highlight?: boolean }[],
  escape: (s: string) => string,
  title?: string,
): string {
  const titleRow = title
    ? `
        <tr>
          <td colspan="2" style="padding:16px 20px; border-bottom:1px solid ${BORDER}; font-family:${FONT}; font-size:15px; font-weight:600; color:${INK};">
            <span style="color:${BRAND}; font-weight:700;">&#10003;</span>&nbsp; ${escape(title)}
          </td>
        </tr>`
    : "";

  const rowsHtml = rows
    .map((row, i) => {
      const border =
        i === rows.length - 1 ? "" : `border-bottom:1px solid ${BORDER};`;
      return `
        <tr>
          <td style="padding:14px 20px; ${border} font-family:${FONT}; font-size:14px; color:${MUTED};">
            ${escape(row.label)}
          </td>
          <td align="right" style="padding:14px 20px 14px 12px; ${border} font-family:${FONT}; font-size:${row.highlight ? "16px" : "14px"}; font-weight:${row.highlight ? "700" : "600"}; color:${row.highlight ? BRAND : INK};">
            ${escape(row.value)}
          </td>
        </tr>`;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:0 0 28px 0; border:1px solid ${BORDER}; border-radius:8px; border-collapse:separate;">
      ${titleRow}
      ${rowsHtml}
    </table>`;
}

/**
 * Bordered list of options, each with a bold title and a short description,
 * separated by hairlines. Titles/descriptions are trusted HTML strings.
 */
export function optionList(
  items: { title: string; description: string }[],
): string {
  const rowsHtml = items
    .map((item, i) => {
      const border =
        i === items.length - 1 ? "" : `border-bottom:1px solid ${BORDER};`;
      return `
        <tr>
          <td style="padding:16px 20px; ${border}">
            <p style="margin:0 0 4px 0; font-family:${FONT}; font-size:15px; font-weight:600; line-height:1.4; color:${INK};">${item.title}</p>
            <p style="margin:0; font-family:${FONT}; font-size:14px; line-height:1.6; color:${MUTED};">${item.description}</p>
          </td>
        </tr>`;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:0 0 28px 0; border:1px solid ${BORDER}; border-radius:8px; border-collapse:separate;">
      ${rowsHtml}
    </table>`;
}

// ---------------------------------------------------------------------------
// Buttons and sharing
// ---------------------------------------------------------------------------

/** Bulletproof primary button (Outlook, Gmail, Apple Mail). */
export function emailActionButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 36px 0;">
      <tr>
        <td align="center" bgcolor="${BRAND}" style="border-radius:6px;">
          <a href="${url}" target="_blank"
            style="display:inline-block; padding:13px 24px; font-family:${FONT}; font-size:14px; font-weight:600; color:#FFFFFF; text-decoration:none; border-radius:6px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

/** wa.me link that opens WhatsApp with a ready-to-send message (user picks the contact). */
export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Light box showing a link; on mobile, press-and-hold copies it. */
export function linkBox(url: string, escape: (s: string) => string): string {
  const safe = escape(url);
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:0 0 16px 0; background-color:${SURFACE}; border:1px solid ${BORDER}; border-radius:6px; border-collapse:separate;">
      <tr>
        <td style="padding:12px 14px; font-family:${MONO}; font-size:13px; line-height:1.5; color:${INK}; word-break:break-all;">
          <a href="${safe}" target="_blank" style="color:${INK}; text-decoration:none;">${safe}</a>
        </td>
      </tr>
    </table>`;
}

/** Green "Share on WhatsApp" button with the WhatsApp icon. */
export function whatsappShareButton(label: string, message: string): string {
  const href = whatsappShareUrl(message);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
      <tr>
        <td align="center" bgcolor="#25D366" style="border-radius:6px;">
          <a href="${href}" target="_blank"
            style="display:inline-block; padding:12px 20px; font-family:${FONT}; font-size:14px; font-weight:600; color:#FFFFFF; text-decoration:none; border-radius:6px;">
            <img src="https://cdn.simpleicons.org/whatsapp/FFFFFF" width="18" height="18" alt=""
              style="vertical-align:middle; margin-right:8px; border:0;" />
            <span style="vertical-align:middle;">${label}</span>
          </a>
        </td>
      </tr>
    </table>`;
}

/** Bordered panel: title, intro, the link, WhatsApp button, small tip. Pass raw strings. */
export function shareSection(
  opts: {
    title: string;
    intro: string;
    url: string;
    whatsappLabel: string;
    whatsappMessage: string;
    note?: string;
  },
  escape: (s: string) => string,
): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:0 0 28px 0; border:1px solid ${BORDER}; border-radius:8px; border-collapse:separate;">
      <tr>
        <td style="padding:22px 20px;">
          <p style="margin:0 0 6px 0; font-family:${FONT}; font-size:16px; font-weight:600; line-height:1.4; color:${INK};">
            ${escape(opts.title)}
          </p>
          <p style="margin:0 0 18px 0; font-family:${FONT}; font-size:14px; line-height:1.6; color:${MUTED};">
            ${escape(opts.intro)}
          </p>
          ${linkBox(opts.url, escape)}
          ${whatsappShareButton(escape(opts.whatsappLabel), opts.whatsappMessage)}
          <p style="margin:0; font-family:${FONT}; font-size:12px; line-height:1.6; color:${MUTED};">
            Tip: press and hold the link to copy it.${opts.note ? ` ${escape(opts.note)}` : ""}
          </p>
        </td>
      </tr>
    </table>`;
}

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------

export function wrapEmail(
  body: string,
  opts: { preheader?: string } = {},
): string {
  const preheader = opts.preheader ?? "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Chamapay</title>
</head>
<body style="margin:0; padding:0; background-color:#FFFFFF;">

  <!-- Preheader: inbox preview text -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">
    ${preheader}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#FFFFFF;">
    <tr>
      <td align="center" style="padding:40px 24px 48px 24px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:560px;">

          <!-- Logo + wordmark, left-aligned -->
          <tr>
            <td align="left" style="padding-bottom:36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:10px; vertical-align:middle;">
                    <img src="${LOGO_URL}" width="32" height="32" alt="Chamapay logo"
                      style="display:block; border:0; outline:none; text-decoration:none;" />
                  </td>
                  <td style="vertical-align:middle; font-family:${FONT}; font-size:18px; font-weight:600; letter-spacing:-0.3px; color:${INK};">
                    Chamapay
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td align="left">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid ${BORDER}; padding-top:24px; font-family:${FONT}; font-size:12px; line-height:1.7; color:${MUTED};">
              You're receiving this because you have a Chamapay account.<br />
              Questions? Just reply to this email.<br />
              &copy; ${new Date().getFullYear()} Chamapay
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}