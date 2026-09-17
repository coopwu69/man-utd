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
