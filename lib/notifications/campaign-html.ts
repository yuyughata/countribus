import { esc } from "@/lib/notifications/email-layout";

/**
 * Build the HTML for a broadcast email campaign (header image → message →
 * button → footer image), in the Countribus wine shell. Pure (no server
 * dependency) so the admin composer can use it for the live preview and the
 * send action for the real email.
 */
export function buildCampaignHtml(opts: {
  previewText?: string | null;
  headerImageUrl?: string | null;
  bodyHtml: string;
  button?: { text?: string | null; url?: string | null };
  footerImageUrl?: string | null;
}): string {
  const preview = opts.previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.previewText)}</div>`
    : "";
  const header = opts.headerImageUrl
    ? `<img src="${esc(opts.headerImageUrl)}" alt="" style="display:block;width:100%;height:auto" />`
    : "";
  const footer = opts.footerImageUrl
    ? `<img src="${esc(opts.footerImageUrl)}" alt="" style="display:block;width:100%;height:auto" />`
    : "";
  const button =
    opts.button?.text && opts.button?.url
      ? `<p style="margin:24px 0 4px"><a href="${esc(opts.button.url)}" style="display:inline-block;background:#8c2743;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;font-size:14px">${esc(opts.button.text)}</a></p>`
      : "";

  return `<!doctype html><html><body style="margin:0;background:#f7f2ee;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#2a0a15">
  ${preview}
  <div style="max-width:600px;margin:0 auto;padding:20px 12px">
    <div style="background:#3d1020;border-radius:14px 14px 0 0;padding:16px 24px">
      <span style="color:#fff;font-size:18px;font-weight:800;letter-spacing:-0.02em">countri<span style="color:#e39bac">bus</span></span>
    </div>
    <div style="background:#ffffff;overflow:hidden">${header}</div>
    <div style="background:#ffffff;padding:24px 28px;font-size:15px;line-height:1.6;color:#2a0a15">
      ${opts.bodyHtml || '<p style="color:#9a8a90">Your message will appear here…</p>'}
      ${button}
    </div>
    <div style="background:#ffffff;border-radius:0 0 14px 14px;overflow:hidden">${footer}</div>
    <p style="text-align:center;color:#9a8a90;font-size:12px;margin:16px 0 0">
      Countribus · You're receiving this because you have a Countribus account.
    </p>
  </div>
  </body></html>`;
}
