const fs = require("fs");
const path = require("path");

// Seen-job IDs are stored as a JSON map { jobId: firstSeenISO } in a file that
// GitHub Actions commits back to the repo after each run. No database needed.
const STATE_FILE = path.join(__dirname, "..", "state", "seen-jobs.json");

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
}

// Drop entries older than `days` so the file doesn't grow forever.
function pruneState(state, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const out = {};
  for (const [id, ts] of Object.entries(state)) {
    const t = Date.parse(ts);
    if (!Number.isNaN(t) && t >= cutoff) out[id] = ts;
  }
  return out;
}

module.exports = { loadState, saveState, pruneState, STATE_FILE };
