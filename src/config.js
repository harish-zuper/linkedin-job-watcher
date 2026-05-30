// Search configuration. Edit these and redeploy to change what gets watched.

// Roles to search for on LinkedIn. Each keyword runs against each location below.
exports.KEYWORDS = [
  "frontend developer",
  "react developer",
  "full stack developer javascript",
  "software engineer javascript",
];

// Locations to search. "India" = anywhere in India.
exports.LOCATIONS = ["Bengaluru", "Chennai", "Kerala", "India"];

// Only fetch jobs posted within this many seconds.
// 7200 = last 2 hours. With an hourly run this gives safe overlap so nothing is
// missed if a run is delayed; Firestore dedup removes the overlap.
exports.LOOKBACK_SECONDS = 7200;

// First page of guest results returns up to 25 cards. Last-hour volume is low,
// so a single page per (keyword x location) is plenty.
exports.MAX_PER_QUERY = 25;

// Optional title filter: if non-empty, a job is kept only when its title contains
// at least one of these (case-insensitive). Helps drop noise / off-target roles.
// Leave as [] to keep everything the search returns.
exports.TITLE_MUST_INCLUDE = [];

// Days to keep a seen job id in Firestore before TTL auto-deletes it.
exports.SEEN_TTL_DAYS = 30;

// Polite crawl settings for the unofficial guest endpoint.
exports.MIN_DELAY_MS = 1200;
exports.MAX_DELAY_MS = 2600;
exports.USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
