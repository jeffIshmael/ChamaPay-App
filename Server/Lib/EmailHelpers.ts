// Shared email design tokens + layout helpers.
// These replace your existing INK / MUTED / SURFACE / ACCENT constants and the
// wrapEmail / heading / paragraph / emailActionButton helpers (same names and
// call signatures, so the rest of your code keeps working).

export const BRAND = "#1a6b6b"; // Chamapay teal
export const ACCENT = "#1a6b6b";
export const INK = "#1F2933";
export const MUTED = "#6B7280";
export const LINE = "#E5E7EB";
export const SURFACE = "#F3F8F8"; // soft teal-tinted panel
export const PAGE_BG = "#F4F6F5";
export const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// TODO: replace with the real, publicly hosted logo URL (PNG, ~96x96px,
// ideally a white or transparent-background version for the teal header)
export const LOGO_URL = "https://chamapay.xyz/images/logo.png";

export function heading(text: string): string {
  return `<h1 style="margin:0 0 16px 0; font-family:${FONT}; font-size:24px; font-weight:700; line-height:1.3; letter-spacing:-0.3px; color:${INK};">${text}</h1>`;
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 18px 0; font-family:${FONT}; font-size:16px; line-height:1.65; color:${INK};">${html}</p>`;
}

/** Round teal check badge shown above the heading on confirmation emails. */
export function successBadge(): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
      <tr>
        <td width="44" height="44" align="center" valign="middle" bgcolor="#DCEEEE"
          style="width:44px; height:44px; border-radius:22px; font-family:${FONT}; font-size:22px; font-weight:700; line-height:44px; color:${BRAND};">
          &#10003;
        </td>
      </tr>
    </table>`;
}

/** Key/value summary card. Values are escaped here, so pass raw strings. */
export function detailsCard(
  rows: { label: string; value: string; highlight?: boolean }[],
  escape: (s: string) => string,
): string {
  const rowsHtml = rows
    .map((row, i) => {
      const border =
        i === rows.length - 1 ? "" : `border-bottom:1px solid #DCE8E8;`;
      return `
        <tr>
          <td style="padding:12px 0; ${border} font-family:${FONT}; font-size:14px; color:${MUTED};">
            ${escape(row.label)}
          </td>
          <td align="right" style="padding:12px 0 12px 16px; ${border} font-family:${FONT}; font-size:${row.highlight ? "17px" : "14px"}; font-weight:${row.highlight ? "700" : "600"}; color:${row.highlight ? ACCENT : INK};">
            ${escape(row.value)}
          </td>
        </tr>`;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:8px 0 24px 0; background-color:${SURFACE}; border:1px solid #DCE8E8; border-radius:12px;">
      <tr>
        <td style="padding:6px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${rowsHtml}
          </table>
        </td>
      </tr>
    </table>`;
}

/** Highlighted list block with a teal edge. Items are trusted HTML strings. */
export function highlightList(items: string[]): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:0 0 24px 0; background-color:${SURFACE}; border-left:3px solid ${BRAND}; border-radius:4px;">
      <tr>
        <td style="padding:14px 18px; font-family:${FONT}; font-size:15px; line-height:1.8; color:${INK};">
          ${items.join("<br />")}
        </td>
      </tr>
    </table>`;
}

/** Bulletproof primary button (works in Outlook, Gmail, Apple Mail). */
export function emailActionButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px 0;">
      <tr>
        <td align="center" bgcolor="${BRAND}" style="border-radius:8px;">
          <a href="${url}" target="_blank"
            style="display:inline-block; padding:14px 28px; font-family:${FONT}; font-size:15px; font-weight:700; color:#FFFFFF; text-decoration:none; border-radius:8px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

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
<body style="margin:0; padding:0; background-color:${PAGE_BG};">

  <!-- Preheader: inbox preview text -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">
    ${preheader}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:${PAGE_BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:560px; background-color:#FFFFFF; border:1px solid ${LINE}; border-radius:12px; overflow:hidden;">

          <!-- Header: logo + wordmark, centred -->
          <tr>
            <td align="center" style="background-color:${BRAND}; padding:22px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="padding-right:10px; vertical-align:middle;">
                    <img src="${LOGO_URL}" width="36" height="36" alt="Chamapay logo"
                      style="display:block; border:0; outline:none; text-decoration:none;" />
                  </td>
                  <td style="vertical-align:middle; font-family:${FONT}; font-size:22px; font-weight:700; letter-spacing:-0.2px; color:#FFFFFF;">
                    Chamapay
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              ${body}
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:560px;">
          <tr>
            <td align="center" style="padding:20px 16px 0 16px; font-family:${FONT}; font-size:12px; line-height:1.6; color:${MUTED};">
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

// ---------------------------------------------------------------------------
// Sharing helpers (invite links, goal links, WhatsApp share)
// ---------------------------------------------------------------------------

/** wa.me link that opens WhatsApp with a ready-to-send message (user picks the contact). */
export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Dashed box showing a link; on mobile, press-and-hold copies it. */
export function linkBox(url: string, escape: (s: string) => string): string {
  const safe = escape(url);
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:0 0 14px 0; background-color:#FFFFFF; border:1px dashed #9CBFBF; border-radius:8px;">
      <tr>
        <td style="padding:12px 14px; font-family:'SFMono-Regular', Consolas, Menlo, monospace; font-size:13px; line-height:1.5; color:${BRAND}; word-break:break-all;">
          <a href="${safe}" target="_blank" style="color:${BRAND}; text-decoration:none;">${safe}</a>
        </td>
      </tr>
    </table>`;
}

/** Green "Share on WhatsApp" button with the WhatsApp icon. */
export function whatsappShareButton(label: string, message: string): string {
  const href = whatsappShareUrl(message);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;">
      <tr>
        <td align="center" bgcolor="#25D366" style="border-radius:8px;">
          <a href="${href}" target="_blank"
            style="display:inline-block; padding:12px 22px; font-family:${FONT}; font-size:15px; font-weight:700; color:#FFFFFF; text-decoration:none; border-radius:8px;">
            <img src="https://cdn.simpleicons.org/whatsapp/FFFFFF" width="18" height="18" alt=""
              style="vertical-align:middle; margin-right:8px; border:0;" />
            <span style="vertical-align:middle;">${label}</span>
          </a>
        </td>
      </tr>
    </table>`;
}

/**
 * Panel with a title, short intro, the link, a WhatsApp share button and an
 * optional note (e.g. "or add them by username"). Pass raw strings; they're escaped here.
 */
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
      style="margin:8px 0 28px 0; background-color:${SURFACE}; border:1px solid #DCE8E8; border-radius:12px;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 6px 0; font-family:${FONT}; font-size:17px; font-weight:700; line-height:1.35; color:${INK};">
            ${escape(opts.title)}
          </p>
          <p style="margin:0 0 16px 0; font-family:${FONT}; font-size:14px; line-height:1.6; color:${MUTED};">
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