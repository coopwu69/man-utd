'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import type { MatchRow, CompGroup, MatchlogTable, MatchlogType, SeasonMatchlogs } from '@/lib/types';
import { matchesForSeason, compInGroup, canonicalComp } from '@/lib/stats';
import { fmt, dash } from '@/lib/format';

const COMP_SHORT: Record<string, string> = {
  'Premier League': 'PL',
  'FA Cup': 'FA',
  'EFL Cup': 'EFL',
  'Champions League': 'UCL',
  'Europa League': 'UEL',
  'Conference League': 'UECL',
  'Community Shield': 'CS',
  'UEFA Super Cup': 'SC',
  'Club World Cup': 'CWC',
  'International Champions Cup': 'ICC',
};

const RESULT_STYLE: Record<string, string> = {
  W: 'bg-success/15 text-success',
  D: 'bg-bg-secondary text-muted',
  L: 'bg-danger/15 text-danger',
};

type TabKey = 'scores' | MatchlogType;
const TABS: TabKey[] = ['scores', 'shooting', 'keeper', 'misc'];

const matchlogCache = new Map<string, Promise<SeasonMatchlogs>>();

function loadMatchlogs(season: string): Promise<SeasonMatchlogs> {
  let p = matchlogCache.get(season);
  if (!p) {
    p = fetch(`data/matchlogs-${season}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<SeasonMatchlogs>) : {}))
      .catch(() => ({}));
    matchlogCache.set(season, p);
  }
  return p;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(-2)}`;
}

function scoreText(m: MatchRow): string {
  if (m.gf == null || m.ga == null) return '—';
  let s = `${m.gf}–${m.ga}`;
  if (m.gfPens != null && m.gaPens != null) s += ` (${m.gfPens}–${m.gaPens} p)`;
  return s;
}

function StatTable({ table, group }: { table: MatchlogTable; group: CompGroup }) {
  const { t } = useI18n();
  const cols = table.columns;
  const compIdx = cols.indexOf('Comp');
  const oppIdx = cols.indexOf('Opponent');
  const endIdx = cols[cols.length - 1] === 'Match Report' ? cols.length - 1 : cols.length;
  const view = cols.slice(0, endIdx);
  const rows = table.rows.filter(
    (r) => compIdx < 0 || compInGroup(r[compIdx] ?? '', group),
  );

  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted">{t('matchLog.noStatData')}</p>;
  }

  return (
    <div className="max-h-[560px] overflow-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead className="sticky top-0 z-10 bg-surface-elevated">
          <tr>
            {view.map((c, i) => (
              <th
                key={`${c}-${i}`}
                className={`whitespace-nowrap border-b border-border px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted ${
                  i > oppIdx ? 'text-right' : 'text-left'
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-border transition-colors hover:bg-bg-secondary">
              {view.map((c, ci) => {
                const v = r[ci] ?? '';
                if (c === 'Date') {
                  return (
                    <td key={ci} className="whitespace-nowrap px-2.5 py-2 text-xs tabular-nums text-muted">
                      {formatDate(v)}
                    </td>
                  );
                }
                if (c === 'Comp') {
                  return (
                    <td key={ci} className="px-2.5 py-2">
                      <span className="rounded bg-bg-secondary px-1 py-0.5 text-[10px] font-semibold text-muted">
                        {COMP_SHORT[canonicalComp(v)] ?? v}
                      </span>
                    </td>
                  );
                }
                if (c === 'Result') {
                  return (
                    <td key={ci} className="px-2.5 py-2">
                      <span
                        className={`rounded px-1 py-0.5 text-xs font-bold ${
                          RESULT_STYLE[v] ?? 'bg-bg-secondary text-muted'
                        }`}
                      >
                        {v || '—'}
                      </span>
                    </td>
                  );
                }
                if (c === 'Opponent') {
                  return (
                    <td key={ci} className="whitespace-nowrap px-2.5 py-2 text-xs font-medium text-primary">
                      {dash(v)}
                    </td>
                  );
                }
                return (
                  <td
                    key={ci}
                    className={`whitespace-nowrap px-2.5 py-2 text-xs tabular-nums ${
                      ci > oppIdx ? 'text-right text-secondary' : 'text-left text-muted'
                    }`}
                  >
                    {v || '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MatchLog({
  matches,
  season,
  group,
  onClose,
}: {
  matches: MatchRow[];
  season: string;
  group: CompGroup;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>('scores');
  const [side, setSide] = useState<'for' | 'against'>('for');
  const [matchlogs, setMatchlogs] = useState<SeasonMatchlogs | null>(null);

  const rows = matchesForSeason(matches, season, group);
  const showComp = group === 'all' || group === 'europe';

  const w = rows.filter((m) => m.result === 'W').length;
  const d = rows.filter((m) => m.result === 'D').length;
  const l = rows.filter((m) => m.result === 'L').length;

  useEffect(() => {
    if (tab === 'scores' || matchlogs != null) return;
    let live = true;
    loadMatchlogs(season).then((data) => {
      if (live) setMatchlogs(data);
    });
    return () => {
      live = false;
    };
  }, [tab, season, matchlogs]);

  const loading = tab !== 'scores' && matchlogs == null;
  const statTable = tab !== 'scores' ? matchlogs?.[tab]?.[side] : undefined;

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <h3 className="truncate font-display text-lg font-semibold text-primary">
            {season} · {t(`competitions.${group}`)}
          </h3>
          <span className="whitespace-nowrap text-sm text-muted">
            {rows.length} {t('matchLog.matches')} · {w}W {d}D {l}L
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-bg-secondary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          aria-label={t('matchLog.close')}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex min-w-0 items-center gap-2 overflow-x-auto border-b border-border px-4 py-2">
        {TABS.map((k) => {
          const active = k === tab;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-pressed={active}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                active
                  ? 'bg-brand-soft text-brand'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {t(`matchLog.tabs.${k}`)}
            </button>
          );
        })}
        {tab !== 'scores' && (
          <span className="ml-auto flex shrink-0 gap-1 rounded-full bg-bg-secondary p-0.5">
            {(['for', 'against'] as const).map((s) => {
              const active = s === side;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  aria-pressed={active}
                  className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                    active ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-primary'
                  }`}
                >
                  {t(`matchLog.side.${s}`)}
                </button>
              );
            })}
          </span>
        )}
      </div>

      {tab === 'scores' ? (
        rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">{t('matchLog.noData')}</p>
        ) : (
          <ul className="max-h-[560px] divide-y divide-border overflow-y-auto">
            {rows.map((m, i) => {
              const meta = [
                m.round,
                m.venue ? t(`matchLog.venue.${m.venue}`) : null,
                m.possession != null ? `${t('matchLog.poss')} ${fmt(m.possession, 0)}%` : null,
                m.xg != null ? `xG ${fmt(m.xg, 2)}` : null,
                m.xga != null ? `xGA ${fmt(m.xga, 2)}` : null,
                m.formation ? `${t('matchLog.form')} ${m.formation}` : null,
                m.attendance != null ? `${t('matchLog.att')} ${m.attendance.toLocaleString()}` : null,
                m.referee,
                m.notes,
              ].filter(Boolean);

              return (
                <li key={`${m.date}-${i}`} className="px-4 py-2.5 transition-colors hover:bg-bg-secondary">
                  <div className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs tabular-nums text-muted">
                      {formatDate(m.date)}
                    </span>
                    {showComp && (
                      <span className="w-10 shrink-0 rounded bg-bg-secondary px-1 py-0.5 text-center text-[10px] font-semibold text-muted">
                        {COMP_SHORT[m.competition] ?? m.competition}
                      </span>
                    )}
                    <span
                      className={`w-7 shrink-0 rounded px-1 py-0.5 text-center text-xs font-bold ${
                        RESULT_STYLE[m.result ?? ''] ?? 'bg-bg-secondary text-muted'
                      }`}
                    >
                      {m.result ?? '—'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
                      {dash(m.opponent)}
                    </span>
                    <span className="shrink-0 font-display text-sm font-semibold tabular-nums text-primary">
                      {scoreText(m)}
                    </span>
                  </div>
                  {meta.length > 0 && (
                    <div className="mt-1 truncate pl-16 text-xs text-muted sm:pl-[7.5rem]">
                      {meta.join(' · ')}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )
      ) : loading ? (
        <p className="px-4 py-6 text-sm text-muted">{t('matchLog.loading')}</p>
      ) : statTable ? (
        <StatTable table={statTable} group={group} />
      ) : (
        <p className="px-4 py-6 text-sm text-muted">{t('matchLog.noStatData')}</p>
      )}
    </div>
  );
}
