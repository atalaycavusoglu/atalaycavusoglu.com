// Contact form endpoint: validates the message and emails it via Resend.
// Needs RESEND_API_KEY (added by the Vercel Resend integration).
const TO = "atalaycavusoglu1@gmail.com";
const FROM = process.env.CONTACT_FROM || "Site İletişim <onboarding@resend.dev>";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  const name = String(body.name || "").trim().slice(0, 100);
  const email = String(body.email || "").trim().slice(0, 200);
  const message = String(body.message || "").trim().slice(0, 5000);

  // Honeypot: real visitors never fill this hidden field.
  if (body.website) return res.status(200).json({ ok: true });

  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "invalid" });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ ok: false, error: "config" });
  }

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: `Siteden yeni mesaj: ${name}`,
      text: `İsim: ${name}\nE-posta: ${email}\n\n${message}`,
      html: `<p><b>İsim:</b> ${esc(name)}<br><b>E-posta:</b> ${esc(email)}</p><p style="white-space:pre-wrap">${esc(message)}</p>`,
    }),
  });

  if (!r.ok) {
    console.error("Resend error", r.status, await r.text());
    return res.status(502).json({ ok: false, error: "send" });
  }
  return res.status(200).json({ ok: true });
};

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
