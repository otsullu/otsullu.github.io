// OTS Ullu — email the site owner about every new comment or reply.
//
// Triggered by a Supabase Database Webhook on INSERT into fb.comments
// (setup steps in supabase/README.md). Runs on Supabase's servers, so the
// recipient address and API keys are secrets that never reach a browser.
//
// Secrets (Edge Functions → Secrets):
//   NOTIFY_EMAIL    where notifications go                     (required)
//   RESEND_API_KEY  API key from resend.com                    (required)
//   WEBHOOK_SECRET  shared secret the webhook sends as header  (required)
//   NOTIFY_FROM     sender, e.g. "OTS Ullu <notifications@otsullu.com>"
//   SITE_URL        defaults to https://otsullu.com
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY   = Deno.env.get("RESEND_API_KEY") ?? "";
const NOTIFY_TO    = Deno.env.get("NOTIFY_EMAIL") ?? "";
const NOTIFY_FROM  = Deno.env.get("NOTIFY_FROM") ?? "OTS Ullu <notifications@otsullu.com>";
const SITE_URL     = (Deno.env.get("SITE_URL") ?? "https://otsullu.com").replace(/\/+$/, "");
const HOOK_SECRET  = Deno.env.get("WEBHOOK_SECRET") ?? "";

type Payload = {
  comment_id: number;
  body: string;
  created_at: string;
  is_reply: boolean;
  as_official: boolean;
  author_name: string | null;
  author_email: string | null;
  item_id: string;
  item_title: string | null;
  item_url: string | null;
  parent_author: string | null;
  parent_body: string | null;
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function quote(s: string): string {
  return `<div style="border-left:3px solid #d4a017;padding:8px 12px;margin:8px 0;` +
    `background:#faf7ef;white-space:pre-wrap;font-size:15px;line-height:1.5">${esc(s)}</div>`;
}

async function loadPayload(commentId: number): Promise<Payload | null> {
  // New-style secret keys (sb_secret_…) go in `apikey` only; legacy JWT keys also as Bearer.
  const headers: Record<string, string> = { apikey: SERVICE_KEY, "Content-Type": "application/json" };
  if (SERVICE_KEY.startsWith("eyJ")) headers.Authorization = `Bearer ${SERVICE_KEY}`;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/notify_payload`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_comment_id: commentId }),
  });
  if (!r.ok) throw new Error(`notify_payload ${r.status}: ${await r.text()}`);
  return await r.json();
}

function buildEmail(p: Payload) {
  const who   = p.as_official ? "OTS Ullu (official)" : (p.author_name ?? "Someone");
  const title = p.item_title ?? p.item_id;
  const link  = SITE_URL + (p.item_url ?? "/");
  const what  = p.is_reply ? "replied" : "commented";
  const when  = new Date(p.created_at).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short",
  });

  const subject = `${p.is_reply ? "New reply" : "New comment"} on "${title}" — ${who}`;
  const html = `
<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:600px;color:#1b1b1d">
  <p style="font-size:15px"><strong>${esc(who)}</strong> ${what} on
     <a href="${esc(link)}">${esc(title)}</a></p>
  ${p.is_reply && p.parent_body ? `<p style="font-size:13px;color:#666;margin-bottom:0">In reply to ${esc(p.parent_author ?? "a comment")}:</p>
  <div style="font-size:13px;color:#666;white-space:pre-wrap;margin:4px 0 12px">${esc(p.parent_body.slice(0, 400))}</div>` : ""}
  ${quote(p.body)}
  <p style="font-size:13px;color:#666">
    ${esc(when)} (Pacific) · commenter email: ${esc(p.author_email ?? "n/a")} · comment #${p.comment_id}
  </p>
  <p style="font-size:14px">
    <a href="${esc(link)}">View on site</a> &nbsp;·&nbsp;
    <a href="${esc(SITE_URL)}/admin/">Moderate (hide / remove)</a>
  </p>
</div>`;
  const text =
    `${who} ${what} on "${title}"\n${link}\n\n${p.body}\n\n` +
    `${when} (Pacific) · commenter email: ${p.author_email ?? "n/a"} · comment #${p.comment_id}\n` +
    `Moderate: ${SITE_URL}/admin/`;
  return { subject, html, text };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!HOOK_SECRET || req.headers.get("x-webhook-secret") !== HOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const event = await req.json().catch(() => null);
  const commentId = Number(event?.record?.id);
  if (event?.type !== "INSERT" || !commentId) return new Response("Ignored");

  if (!NOTIFY_TO || !RESEND_KEY) {
    console.log("notify-comment: NOTIFY_EMAIL or RESEND_API_KEY not set yet; skipping email.");
    return new Response("Not configured");
  }

  try {
    const p = await loadPayload(commentId);
    if (!p) return new Response("Comment not found", { status: 404 });
    const { subject, html, text } = buildEmail(p);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: NOTIFY_FROM, to: [NOTIFY_TO], subject, html, text }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    return new Response("Sent");
  } catch (err) {
    console.error("notify-comment failed:", err);
    return new Response("Error", { status: 500 });
  }
});
