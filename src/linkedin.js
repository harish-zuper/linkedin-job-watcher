const cheerio = require("cheerio");
const {
  KEYWORDS,
  LOCATIONS,
  LOOKBACK_SECONDS,
  MAX_PER_QUERY,
  TITLE_MUST_INCLUDE,
  MIN_DELAY_MS,
  MAX_DELAY_MS,
  USER_AGENT,
} = require("./config");

const GUEST_SEARCH_URL =
  "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = () =>
  MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));

function buildUrl(keyword, location, start = 0) {
  const params = new URLSearchParams({
    keywords: keyword,
    location: location,
    f_TPR: `r${LOOKBACK_SECONDS}`, // posted within last N seconds
    start: String(start),
  });
  return `${GUEST_SEARCH_URL}?${params.toString()}`;
}

// Pull a stable job id out of a card. Prefer the urn, fall back to the link.
function extractJobId($card, url) {
  const urn =
    $card.attr("data-entity-urn") ||
    $card.find("[data-entity-urn]").attr("data-entity-urn") ||
    "";
  const fromUrn = urn.match(/(\d{6,})/);
  if (fromUrn) return fromUrn[1];
  const fromUrl = (url || "").match(/-(\d{6,})(?:\?|$)/);
  return fromUrl ? fromUrl[1] : null;
}

function cleanUrl(href) {
  if (!href) return null;
  try {
    const u = new URL(href);
    return `${u.origin}${u.pathname}`; // strip tracking query params
  } catch {
    return href.split("?")[0];
  }
}

function titlePasses(title) {
  if (!TITLE_MUST_INCLUDE || TITLE_MUST_INCLUDE.length === 0) return true;
  const t = (title || "").toLowerCase();
  return TITLE_MUST_INCLUDE.some((kw) => t.includes(kw.toLowerCase()));
}

function parseCards(html, query) {
  const $ = cheerio.load(html);
  const jobs = [];
  $("li").each((_, li) => {
    const $li = $(li);
    const $card = $li.find(".base-card, .base-search-card").first();
    if ($card.length === 0) return;

    const link = cleanUrl($card.find("a.base-card__full-link").attr("href"));
    const jobId = extractJobId($card, link);
    if (!jobId) return;

    const title = $card.find("h3.base-search-card__title").text().trim();
    const company = $card
      .find("h4.base-search-card__subtitle a, h4.base-search-card__subtitle")
      .first()
      .text()
      .trim();
    const location = $card
      .find(".job-search-card__location")
      .text()
      .trim();
    const postedAt =
      $card.find("time").attr("datetime") ||
      $card.find("time").text().trim() ||
      "";

    if (!titlePasses(title)) return;

    jobs.push({ jobId, title, company, location, url: link, postedAt, query });
  });
  return jobs;
}

async function fetchQuery(keyword, location) {
  const url = buildUrl(keyword, location, 0);
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (res.status === 429) {
    console.warn(`[linkedin] 429 rate-limited for "${keyword}" @ ${location}`);
    return [];
  }
  if (!res.ok) {
    console.warn(
      `[linkedin] HTTP ${res.status} for "${keyword}" @ ${location}`
    );
    return [];
  }

  const html = await res.text();
  const jobs = parseCards(html, `${keyword} @ ${location}`);
  return jobs.slice(0, MAX_PER_QUERY);
}

// Run every keyword x location, dedupe by jobId within this run, return array.
async function fetchAllLinkedInJobs() {
  const byId = new Map();
  for (const keyword of KEYWORDS) {
    for (const location of LOCATIONS) {
      try {
        const jobs = await fetchQuery(keyword, location);
        for (const job of jobs) {
          if (!byId.has(job.jobId)) byId.set(job.jobId, job);
        }
        console.log(
          `[linkedin] "${keyword}" @ ${location}: ${jobs.length} cards`
        );
      } catch (err) {
        console.warn(
          `[linkedin] error for "${keyword}" @ ${location}: ${err.message}`
        );
      }
      await sleep(jitter()); // be polite between requests
    }
  }
  return [...byId.values()];
}

module.exports = { fetchAllLinkedInJobs, parseCards, buildUrl };
