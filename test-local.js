// Local dry-run: validates the LinkedIn fetch/parse and (optionally) Telegram.
// Reads Telegram creds from functions/.env.local OR the environment.
//
// Usage:
//   node test-local.js                 # fetch one query, print parsed jobs
//   node test-local.js --all           # fetch every keyword x location
//   node test-local.js --telegram      # also send a sample to Telegram

const fs = require("fs");
const path = require("path");

// Load creds from .env.local if present (checks repo root and functions/).
for (const p of [
  path.join(__dirname, ".env.local"),
  path.join(__dirname, "functions", ".env.local"),
]) {
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const { buildUrl, parseCards, fetchAllLinkedInJobs } = require("./src/linkedin");
const { sendTelegram } = require("./src/telegram");
const { KEYWORDS, LOCATIONS, USER_AGENT } = require("./src/config");

const wantAll = process.argv.includes("--all");
const wantTelegram = process.argv.includes("--telegram");

async function fetchOne(keyword, location) {
  const url = buildUrl(keyword, location, 0);
  console.log(`GET ${url}`);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  console.log(`HTTP ${res.status}`);
  if (!res.ok) return [];
  return parseCards(await res.text(), `${keyword} @ ${location}`);
}

(async () => {
  const jobs = wantAll
    ? await fetchAllLinkedInJobs()
    : await fetchOne(KEYWORDS[0], LOCATIONS[0]);

  console.log(`\nParsed ${jobs.length} job(s):\n`);
  for (const j of jobs.slice(0, 15)) {
    console.log(`• [${j.jobId}] ${j.title} — ${j.company}`);
    console.log(`    ${j.location} | ${j.postedAt}`);
    console.log(`    ${j.url}`);
  }
  if (jobs.length > 15) console.log(`  ... and ${jobs.length - 15} more`);

  if (wantTelegram) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      console.error("\n[telegram] set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID");
      process.exit(1);
    }
    const sample = jobs.slice(0, 3);
    if (sample.length === 0) {
      sample.push({
        jobId: "test",
        title: "Test message from linkedin-job-watcher",
        company: "Setup check",
        location: "Bengaluru",
        postedAt: "now",
        url: "https://www.linkedin.com/jobs/",
      });
    }
    await sendTelegram(sample, token, chatId);
    console.log(`\n[telegram] sent ${sample.length} sample job(s) ✓`);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
