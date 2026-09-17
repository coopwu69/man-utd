'use client';

import { X } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import type { MatchRow, CompGroup } from '@/lib/types';
import { matchesForSeason } from '@/lib/stats';
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
  const rows = matchesForSeason(matches, season, group);
  const showComp = group === 'all' || group === 'europe';

  const w = rows.filter((m) => m.result === 'W').length;
  const d = rows.filter((m) => m.result === 'D').length;
  const l = rows.filter((m) => m.result === 'L').length;

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

      {rows.length === 0 ? (
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
      )}
    </div>
  );
}
