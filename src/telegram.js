const TG_API = "https://api.telegram.org";
const MAX_MSG = 3900; // stay safely under Telegram's 4096-char limit

function escapeHtml(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatJob(job) {
  const title = escapeHtml(job.title || "Untitled role");
  const company = escapeHtml(job.company || "Unknown company");
  const location = escapeHtml(job.location || "");
  const meta = [location, job.postedAt].filter(Boolean).join(" · ");
  const link = job.url || "";
  return (
    `🆕 <b>${title}</b> — ${company}\n` +
    (meta ? `📍 ${meta}\n` : "") +
    (link ? `🔗 <a href="${link}">View / Apply</a>` : "")
  );
}

// Split formatted job blocks into messages under the size limit.
function chunkMessages(jobs) {
  const blocks = jobs.map(formatJob);
  const messages = [];
  let buf = `📣 <b>${jobs.length} new LinkedIn job(s)</b>\n\n`;
  for (const block of blocks) {
    if ((buf + block + "\n\n").length > MAX_MSG) {
      messages.push(buf.trim());
      buf = "";
    }
    buf += block + "\n\n";
  }
  if (buf.trim()) messages.push(buf.trim());
  return messages;
}

async function sendOne(token, chatId, text) {
  const res = await fetch(`${TG_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function sendTelegram(jobs, token, chatId) {
  if (!jobs || jobs.length === 0) return;
  // chatId may be a comma-separated list of recipients (you + friends).
  const recipients = String(chatId)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const messages = chunkMessages(jobs);
  for (const rid of recipients) {
    for (const msg of messages) {
      try {
        await sendOne(token, rid, msg);
      } catch (e) {
        // One bad recipient (e.g. hasn't messaged the bot yet) shouldn't block others.
        console.warn(`[telegram] failed to send to ${rid}: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 400)); // gentle pacing
    }
  }
}

module.exports = { sendTelegram, formatJob, chunkMessages };
