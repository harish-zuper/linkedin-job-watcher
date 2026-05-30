# LinkedIn Job Watcher → Telegram

Runs **every hour on GitHub Actions (100% free, no card)** — fetches **newly
posted** LinkedIn jobs for your target roles/locations and pushes only the **new**
ones to your **Telegram**.

| Piece | File |
|---|---|
| Roles & locations (edit these) | `src/config.js` |
| Fetch + parse (LinkedIn guest endpoint) | `src/linkedin.js` |
| Telegram delivery | `src/telegram.js` |
| Dedup state (committed JSON) | `src/state.js` + `state/seen-jobs.json` |
| Orchestration | `src/run.js` |
| Hourly schedule | `.github/workflows/job-watcher.yml` |

## How dedup works
Each run reads `state/seen-jobs.json`, fetches jobs posted in the last 2 hours,
sends only IDs not already seen, then the workflow commits the updated state back
to the repo. Entries older than 30 days are pruned automatically.

## Config
Edit `src/config.js`:
- `KEYWORDS` — roles to search (currently frontend / react / full-stack JS / SWE JS)
- `LOCATIONS` — Bengaluru, Chennai, Kerala, India
- `LOOKBACK_SECONDS` — 7200 (2h) gives safe overlap for an hourly schedule
- `TITLE_MUST_INCLUDE` — optional title keyword filter (empty = keep all)

Change cadence via the `cron:` line in the workflow (`0 * * * *` = hourly, UTC).

## Local testing
```bash
npm install
node test-local.js              # one query, prints parsed jobs
node test-local.js --all        # all keyword x location combos
# Telegram creds live in .env.local (gitignored):
node test-local.js --telegram   # sends a sample to your Telegram
```

## Telegram setup
1. @BotFather → `/newbot` → copy bot token.
2. Send your bot any message, then @userinfobot → `/start` for your numeric chat id.
3. Store both as repo Actions secrets `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

## Notes
- Uses LinkedIn's public guest endpoint (no login). Unofficial — polite delays and
  a real User-Agent are built in; volume is tiny.
- GitHub may delay scheduled runs a few minutes under load; the 2h lookback absorbs
  that. Scheduled workflows auto-disable after 60 days of no repo activity — the
  state commits keep it active while jobs are flowing.
