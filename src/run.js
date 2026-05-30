// Entry point run by GitHub Actions every hour.
// Fetches new LinkedIn jobs, sends new ones to Telegram, updates the seen-state file.

const { fetchAllLinkedInJobs } = require("./linkedin");
const { sendTelegram } = require("./telegram");
const { loadState, saveState, pruneState } = require("./state");
const { SEEN_TTL_DAYS } = require("./config");

(async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars");
    process.exit(1);
  }

  const state = pruneState(loadState(), SEEN_TTL_DAYS);
  const jobs = await fetchAllLinkedInJobs();
  const fresh = jobs.filter((j) => !state[j.jobId]);
  console.log(`Fetched ${jobs.length} unique job(s); ${fresh.length} are new`);

  if (fresh.length > 0) {
    await sendTelegram(fresh, token, chatId);
    const now = new Date().toISOString();
    for (const j of fresh) state[j.jobId] = now;
    console.log(`Notified + recorded ${fresh.length} new job(s)`);
  }

  // Always save so pruning is persisted even when there are no new jobs.
  saveState(state);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
