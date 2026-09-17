# Man Utd data workspace

## Files
- `man-utd-seasons.csv` / `man-utd-seasons.json` — top-level copies of the dataset
- `man-utd-dashboard/` — Next.js dashboard + data pipeline (real source of truth)
  - `scripts/build_data.py` — merges raw scrapes into `data/man-utd-seasons.{csv,json}`
  - `data/raw/history.json` — firecrawl markdown of fbref Stats & History page (all seasons)
  - `data/raw/matchlog-YYYY-YYYY.json` — per-season Scores & Fixtures tables, 1992-93..2025-26
  - `data/raw/understat-YYYY.json` — EPL xG per match, 2014-15+ only

## Refresh command
User says "อัพเดต man utd csv" or "refresh fbref" → re-scrape changed raw files,
re-run `python -X utf8 scripts/build_data.py` in `man-utd-dashboard/`, then copy
`data/man-utd-seasons.{csv,json}` to this folder.

## Re-scraping matchlogs (fbref blocks bots — Cloudflare 403)
- Raw HTTP/XHR fetch fails even inside an fbref page context. Must use Playwright
  `browser_navigate` per URL, wait ~8s if "Just a moment..." challenge, then
  `browser_evaluate` to serialize the Scores & Fixtures table to markdown:
  header row `| Date | Time | Comp | ... |`, separator, one `| ... |` line per match.
  Save as `{markdown, metadata:{sourceURL}}` JSON — same shape as existing raw files.
- Playwright `filename` results land in its own workspace root — check
  `man-utd-dashboard/` subdirs if a file seems missing from cwd.
- URL pattern: `https://fbref.com/en/squads/19538871/{SEASON}/matchlogs/all_comps/schedule/Manchester-United-Scores-and-Fixtures-All-Competitions`
- BULK ALTERNATIVE (used for stat logs): after navigating to ANY fbref page once,
  `fetch(url, {credentials:'include'})` inside `browser_evaluate` works same-origin
  and returns full HTML (Cloudflare cookie already set). Loop seasons × types in a
  single evaluate with ~700ms delay; parse with `DOMParser`, select
  `table#matchlogs_for` + `table#matchlogs_against`. Much faster than navigating.

## Stat matchlogs (shooting / keeper / misc)
- Raw files: `data/raw/matchlog-YYYY-YYYY-{shooting,keeper,misc}.json` —
  `{tables: [{label, columns, rows}], metadata:{sourceURL}}` (structured JSON,
  NOT markdown like schedule files). `label` = "For Manchester United" or
  "Against Manchester United".
- URL pattern: same as schedule but `/all_comps/{shooting|keeper|misc}/` and
  page slug `Manchester-United-Match-Logs-All-Competitions`.
- `scripts/build_matchlogs.py` → merged `data/man-utd-matchlogs.json` +
  per-season `public/data/matchlogs-YYYY-YYYY.json` (lazy-fetched by MatchLog UI).
- `build_matches.py` glob intentionally matches only `matchlog-\d{4}-\d{4}.json`
  so stat files are not parsed as schedules.
- Old seasons have empty cells for many stat columns (fbref coverage) — rows are
  kept verbatim; UI renders blanks as "—".

## Coverage limits (fbref's, not bugs)
- Domestic cups (FA Cup, League/EFL Cup) + Charity/Community Shield only exist on
  fbref from ~2014-15 (partially) / 2016-17 (full). Older seasons = league + Europe only.
- xG only from Understat, 2014-15 onward, Premier League only. Null elsewhere.
- fbref history table vs matchlog occasionally disagree (e.g. shootout legs counted
  as W vs D). Pipeline prefers matchlog and prints mismatches.

## Gotchas
- Console is cp1252 — use `python -X utf8` when printing scraped text.
- History markdown bolds title-winning ranks (`**1st**`) — strip_md removes `*`.
- UEFA Cup is canonicalized to "Europa League" (same competition, renamed).

## Display rules
- **ทศนิยม 2 ตำแหน่งเท่านั้น** — all displayed decimals (per-match stats, xG, %, deltas) use exactly 2 decimal places; rounding is fine. Default `dec = 2` in `src/lib/format.ts`. Integers stay integers.
