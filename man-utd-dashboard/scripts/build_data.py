"""Build data/man-utd-seasons.csv + .json from raw scrapes in data/raw/.

Sources:
  - data/raw/history.json          fbref Stats & History page (firecrawl markdown)
  - data/raw/matchlog-*.json       fbref season match logs (schedule view)
  - data/raw/understat-*.json      understat EPL xG per match (2014-15+)

Outputs rows: Season, Competition, LgRank, MP, W, D, L, GF, GA, GD, Pts,
Pts/MP, xG, xGA, xGD, CS, Top Team Scorer, Goalkeeper, Notes
Plus an "All Competitions" aggregate row per season.
"""
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
SEASONS = [f"{y}-{y+1}" for y in range(1992, 2026)]  # 1992-1993 .. 2025-2026

COMP_MAP = {
    "premier league": "Premier League",
    "champions lg": "Champions League",
    "champions league": "Champions League",
    "europa lg": "Europa League",
    "europa league": "Europa League",
    "uefa cup": "Europa League",
    "conference lg": "Conference League",
    "conference league": "Conference League",
    "fa cup": "FA Cup",
    "efl cup": "EFL Cup",
    "league cup": "EFL Cup",
    "fa community shield": "Community Shield",
    "community shield": "Community Shield",
    "uefa super cup": "UEFA Super Cup",
    "super cup": "UEFA Super Cup",
    "club world cup": "Club World Cup",
    "fifa club world cup": "Club World Cup",
    "international champions cup": "International Champions Cup",
}
COMP_ORDER = [
    "Premier League", "FA Cup", "EFL Cup", "Champions League", "Europa League",
    "Conference League", "Club World Cup", "UEFA Super Cup", "Community Shield",
    "International Champions Cup",
]


def strip_md(cell: str) -> str:
    cell = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", cell).strip()
    cell = cell.replace("\\-", "-").replace("\\", "").replace("*", "")
    return re.sub(r"\s+", " ", cell)


def canon_comp(raw: str) -> str:
    raw = re.sub(r"^\d+\.\s*", "", strip_md(raw)).strip()
    return COMP_MAP.get(raw.lower(), raw)


def num(cell: str):
    cell = strip_md(cell).replace(",", "").replace("+", "")
    if cell in ("", "-", "—"):
        return None
    m = re.match(r"^-?\d+(\.\d+)?", cell)
    return float(m.group(0)) if m else None


def parse_tables(md: str):
    """Yield (section_heading, [header], [rows]) for each markdown table."""
    lines = md.splitlines()
    heading = ""
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("## "):
            heading = line.lstrip("# ").strip()
        if line.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s\-|]+\|", lines[i + 1]):
            header = [strip_md(c) for c in line.strip().strip("|").split("|")]
            rows = []
            i += 2
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                rows.append(cells)
                i += 1
            yield heading, header, rows
            continue
        i += 1


def load_md(path: Path) -> str:
    return json.loads(path.read_text(encoding="utf-8"))["markdown"]


# ---------- 1. matchlog aggregation: season x comp -> stats ----------
def matchlog_stats():
    agg = {}  # (season, comp) -> dict
    for season in SEASONS:
        p = RAW / f"matchlog-{season}.json"
        md = load_md(p)
        found = False
        for heading, header, rows in parse_tables(md):
            if "Scores & Fixtures" not in heading or not header or header[0] != "Date":
                continue
            found = True
            idx = {name: k for k, name in enumerate(header)}
            for r in rows:
                if len(r) < len(header):
                    continue
                comp = canon_comp(r[idx["Comp"]])
                res = strip_md(r[idx["Result"]])
                gf = num(re.sub(r"\(.*\)", "", r[idx["GF"]]))
                ga = num(re.sub(r"\(.*\)", "", r[idx["GA"]]))
                if res not in ("W", "D", "L") or gf is None or ga is None:
                    continue
                a = agg.setdefault((season, comp), dict(mp=0, w=0, d=0, l=0, gf=0, ga=0, cs=0))
                a["mp"] += 1
                a[res.lower()] += 1
                a["gf"] += int(gf)
                a["ga"] += int(ga)
                a["cs"] += 1 if ga == 0 else 0
        if not found:
            print(f"WARN: no matchlog table for {season}", file=sys.stderr)
    return agg


# ---------- 2. history tables -> canonical rows ----------
def history_rows():
    md = load_md(RAW / "history.json")
    out = {}
    sections = {
        "Domestic Leagues Results",
        "International Cup Results",
        "Domestic Cup Results",
        "International Super Cup Results",
        "Domestic Super Cup Results",
    }
    for heading, header, rows in parse_tables(md):
        if heading not in sections or not header or header[0] != "Season":
            continue
        idx = {name: k for k, name in enumerate(header)}
        for r in rows:
            if len(r) < 5:
                continue
            season = strip_md(r[idx["Season"]])
            if season not in SEASONS:
                continue
            comp = canon_comp(r[idx["Comp"]])
            g = lambda name: num(r[idx[name]]) if idx.get(name) is not None and idx[name] < len(r) else None
            s = lambda name: strip_md(r[idx[name]]) if idx.get(name) is not None and idx[name] < len(r) else ""
            out[(season, comp)] = {
                "season": season,
                "competition": comp,
                "rank": s("LgRank") or None,
                "mp": int(g("MP") or 0),
                "w": int(g("W") or 0),
                "d": int(g("D") or 0),
                "l": int(g("L") or 0),
                "gf": int(g("GF") or 0),
                "ga": int(g("GA") or 0),
                "gd": int(g("GD") or 0) if g("GD") is not None else int(g("GF") or 0) - int(g("GA") or 0),
                "pts": int(g("Pts") or 0),
                "attendance": g("Attendance"),
                "topScorer": s("Top Team Scorer") or None,
                "goalkeeper": s("Goalkeeper") or None,
                "notes": s("Notes") or None,
            }
    return out


# ---------- 3. understat xG (Premier League only) ----------
def understat_xg():
    xg = {}  # season -> (xg_for, xg_against, matches)
    for yr in range(2014, 2026):
        p = RAW / f"understat-{yr}.json"
        if not p.exists():
            continue
        season = f"{yr}-{yr+1}"
        d = json.loads(p.read_text(encoding="utf-8"))
        xf = xa = 0.0
        n = 0
        for m in d.get("dates", []):
            if not m.get("isResult"):
                continue
            side = m["side"]  # 'h' if MU home
            xf += float(m["xG"][side])
            xa += float(m["xG"]["a" if side == "h" else "h"])
            n += 1
        xg[season] = (round(xf, 1), round(xa, 1), n)
    return xg


def main():
    ml = matchlog_stats()
    hist = history_rows()
    xg = understat_xg()

    keys = set(hist) | set(ml)
    rows = []
    mismatches = []
    for (season, comp) in sorted(keys, key=lambda k: (k[0], COMP_ORDER.index(k[1]) if k[1] in COMP_ORDER else 99)):
        h = hist.get((season, comp))
        a = ml.get((season, comp))
        if h is None:
            h = dict(season=season, competition=comp, rank=None, mp=a["mp"], w=a["w"], d=a["d"],
                     l=a["l"], gf=a["gf"], ga=a["ga"], gd=a["gf"] - a["ga"], pts=3 * a["w"] + a["d"],
                     attendance=None, topScorer=None, goalkeeper=None, notes=None)
        elif a:
            # Match logs are match-level truth; fbref history occasionally
            # records shootout games differently. Prefer matchlog results.
            for k_h, k_a in (("mp", "mp"), ("w", "w"), ("d", "d"), ("l", "l"), ("gf", "gf"), ("ga", "ga")):
                if h[k_h] != a[k_a]:
                    mismatches.append((season, comp, k_h, h[k_h], a[k_a]))
                    h[k_h] = a[k_a]
            h["gd"] = h["gf"] - h["ga"]
            h["pts"] = 3 * h["w"] + h["d"]
        row = dict(h)
        row["cs"] = a["cs"] if a else None
        row["ptsPerMp"] = round(row["pts"] / row["mp"], 2) if row["mp"] else None
        if comp == "Premier League" and season in xg:
            xf, xa, n = xg[season]
            row["xg"], row["xga"], row["xgd"] = xf, xa, round(xf - xa, 1)
        else:
            row["xg"] = row["xga"] = row["xgd"] = None
        rows.append(row)

    # All Competitions aggregate per season
    all_rows = []
    for season in SEASONS:
        comp_rows = [r for r in rows if r["season"] == season]
        if not comp_rows:
            continue
        mp = sum(r["mp"] for r in comp_rows)
        w = sum(r["w"] for r in comp_rows)
        d = sum(r["d"] for r in comp_rows)
        l = sum(r["l"] for r in comp_rows)
        gf = sum(r["gf"] for r in comp_rows)
        ga = sum(r["ga"] for r in comp_rows)
        cs_vals = [r["cs"] for r in comp_rows if r["cs"] is not None]
        pts = 3 * w + d
        all_rows.append(dict(season=season, competition="All Competitions", rank=None,
                             mp=mp, w=w, d=d, l=l, gf=gf, ga=ga, gd=gf - ga, pts=pts,
                             ptsPerMp=round(pts / mp, 2) if mp else None,
                             xg=None, xga=None, xgd=None,
                             cs=sum(cs_vals) if len(cs_vals) == len(comp_rows) else (sum(cs_vals) if cs_vals else None),
                             attendance=None, topScorer=None, goalkeeper=None, notes=None))
    rows.extend(all_rows)

    rows.sort(key=lambda r: (r["season"], COMP_ORDER.index(r["competition"]) if r["competition"] in COMP_ORDER else 99))

    out_csv = ROOT / "data" / "man-utd-seasons.csv"
    cols = ["season", "competition", "rank", "mp", "w", "d", "l", "gf", "ga", "gd",
            "pts", "ptsPerMp", "xg", "xga", "xgd", "cs", "attendance", "topScorer",
            "goalkeeper", "notes"]
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        wcsv = csv.DictWriter(f, fieldnames=cols)
        wcsv.writeheader()
        for r in rows:
            wcsv.writerow({k: ("" if r.get(k) is None else r.get(k)) for k in cols})

    (ROOT / "data" / "man-utd-seasons.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"rows: {len(rows)}  seasons: {len(set(r['season'] for r in rows))}")
    if mismatches:
        print("history vs matchlog mismatches:")
        for m in mismatches:
            print("  ", m)
    for s in SEASONS:
        comps = [r["competition"] for r in rows if r["season"] == s and r["competition"] != "All Competitions"]
        print(s, comps)


if __name__ == "__main__":
    main()
