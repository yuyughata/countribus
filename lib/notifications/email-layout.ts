/**
 * Shared branded (wine) HTML shell for all Countribus transactional emails.
 * Inline styles only — email clients ignore <style>/external CSS.
 */

export function esc(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}

export type EmailButton = { label: string; url: string };

export function emailShell(opts: {
  previewText?: string;
  heading: string;
  intro?: string;
  rows?: [string, string][];
  bodyHtml?: string;
  button?: EmailButton;
  appendHtml?: string;
  footerNote?: string;
}): string {
  const preview = opts.previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.previewText)}</div>`
    : "";
  const rows = (opts.rows ?? [])
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 0;color:#7a6a70;font-size:14px">${esc(k)}</td><td style="padding:7px 0;text-align:right;font-weight:600;color:#2a0a15;font-size:14px">${esc(v)}</td></tr>`,
    )
    .join("");
  const table = rows
    ? `<table style="width:100%;border-collapse:collapse;margin:18px 0;border-top:1px solid #efe6e9;border-bottom:1px solid #efe6e9">${rows}</table>`
    : "";
  const button = opts.button
    ? `<p style="margin:22px 0"><a href="${esc(opts.button.url)}" style="display:inline-block;background:#8c2743;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;font-size:14px">${esc(opts.button.label)}</a></p>`
    : "";
  const footerNote = opts.footerNote
    ? `<p style="color:#9a8a90;font-size:13px;margin:16px 0 0">${esc(opts.footerNote)}</p>`
    : "";

  return `<!doctype html><html><body style="margin:0;background:#f7f2ee;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#2a0a15">
  ${preview}
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#3d1020;border-radius:16px 16px 0 0;padding:20px 28px">
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.02em">countri<span style="color:#e39bac">bus</span></span>
    </div>
    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:28px">
      <h1 style="margin:0 0 10px;font-size:22px;color:#2a0a15">${esc(opts.heading)}</h1>
      ${opts.intro ? `<p style="margin:0 0 6px;font-size:15px;line-height:1.55;color:#3d2a30">${esc(opts.intro)}</p>` : ""}
      ${table}
      ${opts.bodyHtml ?? ""}
      ${button}
      ${opts.appendHtml ?? ""}
      ${footerNote}
    </div>
    <p style="text-align:center;color:#9a8a90;font-size:12px;margin:16px 0 0">
      Countribus · Nigeria's intercity bus marketplace
    </p>
  </div>
  </body></html>`;
}
