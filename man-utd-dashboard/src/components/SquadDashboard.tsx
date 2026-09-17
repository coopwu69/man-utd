'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipContentProps,
} from 'recharts';
import { useI18n } from '@/i18n/I18nContext';
import type { SquadData, SquadPlayer } from '@/lib/types';
import { fmt, gbp, dash } from '@/lib/format';

type SortKey = 'name' | 'pos' | 'age' | 'weeklyGross' | 'yearlyGross' | 'expires' | 'status';
type SortDir = 'asc' | 'desc';

function sum(values: (number | null | undefined)[]): number {
  return values.reduce((acc: number, v) => acc + (v ?? 0), 0);
}

function posColor(pos: string) {
  switch (pos) {
    case 'G':
      return 'bg-info-soft text-info';
    case 'D':
      return 'bg-success-soft text-success';
    case 'M':
      return 'bg-warning-soft text-warning';
    case 'F':
      return 'bg-danger-soft text-danger';
    default:
      return 'bg-bg-secondary text-muted';
  }
}

export function SquadDashboard({ data }: { data: SquadData }) {
  const { t } = useI18n();
  const { players, updated } = data;
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'weeklyGross', dir: 'desc' });

  const weeklyBill = useMemo(() => sum(players.map((p) => p.weeklyGross)), [players]);
  const yearlyBill = useMemo(() => sum(players.map((p) => p.yearlyGross)), [players]);
  const avgAge = useMemo(() => {
    const withAge = players.filter((p) => p.age != null);
    if (withAge.length === 0) return null;
    return withAge.reduce((acc, p) => acc + (p.age ?? 0), 0) / withAge.length;
  }, [players]);

  const ageBands = useMemo(() => {
    const bands = [
      { key: '≤19', max: 19 },
      { key: '20–23', max: 23 },
      { key: '24–27', max: 27 },
      { key: '28–31', max: 31 },
      { key: '32+', max: Infinity },
    ];
    const out = bands.map((b) => ({ band: b.key, count: 0 }));
    for (const p of players) {
      if (p.age == null) continue;
      const band = bands.find((b) => p.age! <= b.max) ?? bands[bands.length - 1];
      const item = out.find((o) => o.band === band.key)!;
      item.count += 1;
    }
    return out;
  }, [players]);

  const expiry = useMemo(() => {
    const groups = new Map<string, number>();
    for (const p of players) {
      if (!p.expires) continue;
      groups.set(p.expires, (groups.get(p.expires) ?? 0) + 1);
    }
    return Array.from(groups.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [players]);

  const getSortValue = (p: SquadPlayer, key: SortKey) => {
    switch (key) {
      case 'name':
        return p.name;
      case 'pos':
        return `${p.pos}-${p.subPos ?? ''}`;
      case 'age':
        return p.age ?? -Infinity;
      case 'weeklyGross':
        return p.weeklyGross ?? -Infinity;
      case 'yearlyGross':
        return p.yearlyGross ?? -Infinity;
      case 'expires':
        return p.expires ? Number(p.expires) : -Infinity;
      case 'status':
        return p.status ?? '';
      default:
        return '';
    }
  };

  const sortedRows = useMemo(() => {
    const copy = [...players];
    copy.sort((a, b) => {
      const aVal = getSortValue(a, sort.key);
      const bVal = getSortValue(b, sort.key);
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [players, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const axisTick = { fill: 'var(--text-muted)', fontSize: 11 };
  const gridStroke = 'var(--border)';

  function ChartTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-border bg-surface-elevated p-3 shadow-sm">
        <p className="mb-1 text-xs font-semibold text-primary">{label}</p>
        <div className="flex flex-col gap-1">
          {payload.map((entry, idx) => {
            const value = entry.value;
            const text = typeof value === 'number' && !Number.isNaN(value) ? fmt(value, 0) : '—';
            const color = entry.color ?? 'var(--text-muted)';
            return (
              <div key={idx} className="flex items-center gap-2 text-xs text-secondary">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-semibold text-primary">{text}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const kpi = [
    { label: t('squad.kpi.weeklyBill'), value: gbp(weeklyBill, 0) },
    { label: t('squad.kpi.yearlyBill'), value: gbp(yearlyBill, 0) },
    { label: t('squad.kpi.playerCount'), value: fmt(players.length, 0) },
    { label: t('squad.kpi.avgAge'), value: fmt(avgAge, 1) },
  ];

  const columns: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'name', label: t('squad.table.name'), align: 'left' },
    { key: 'pos', label: t('squad.table.pos'), align: 'left' },
    { key: 'age', label: t('squad.table.age'), align: 'right' },
    { key: 'weeklyGross', label: t('squad.table.weeklyGross'), align: 'right' },
    { key: 'yearlyGross', label: t('squad.table.yearlyGross'), align: 'right' },
    { key: 'expires', label: t('squad.table.expires'), align: 'right' },
    { key: 'status', label: t('squad.table.status'), align: 'left' },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-6 py-8 lg:px-10">
      <section className="flex min-w-0 flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-primary">{t('squad.title')}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {kpi.map((k) => (
            <div
              key={k.label}
              className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm dark:shadow-none"
            >
              <span className="text-xs font-medium text-muted">{k.label}</span>
              <span className="mt-2 font-body text-3xl font-bold text-primary">{k.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title={t('squad.chart.ageTitle')}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ageBands} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="band" tick={axisTick} axisLine={{ stroke: gridStroke }} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={ChartTooltip} />
              <Bar dataKey="count" fill="var(--brand)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('squad.chart.expiryTitle')}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={expiry} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tick={axisTick} axisLine={{ stroke: gridStroke }} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={ChartTooltip} />
              <Bar dataKey="count" fill="var(--info)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm dark:shadow-none">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-display text-lg font-semibold text-primary">{t('squad.table.title')}</h3>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-elevated">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className={`cursor-pointer border-b border-border px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted transition-colors hover:bg-bg-secondary ${
                      col.align === 'left' ? 'text-left' : 'text-right'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1 ${
                        col.align === 'right' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span>{col.label}</span>
                      {sort.key === col.key ? (
                        sort.dir === 'asc' ? (
                          <ArrowUp size={14} />
                        ) : (
                          <ArrowDown size={14} />
                        )
                      ) : (
                        <ArrowUpDown size={14} className="opacity-30" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((p, idx) => (
                <tr
                  key={`${p.name}-${idx}`}
                  className="border-b border-border transition-colors hover:bg-bg-secondary"
                >
                  <td className="px-3 py-3 text-sm font-medium text-primary">{p.name}</td>
                  <td className="px-3 py-3 text-sm text-secondary">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${posColor(p.pos)}`}>
                        {t(`squad.pos.${p.pos}`)}
                      </span>
                      {p.subPos && <span className="text-xs text-muted">{p.subPos}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-secondary">{fmt(p.age, 0)}</td>
                  <td className="px-3 py-3 text-right text-sm text-secondary">{gbp(p.weeklyGross, 0)}</td>
                  <td className="px-3 py-3 text-right text-sm text-secondary">{gbp(p.yearlyGross, 0)}</td>
                  <td className="px-3 py-3 text-right text-sm text-secondary">{dash(p.expires)}</td>
                  <td className="px-3 py-3 text-left text-sm text-secondary">{dash(p.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer>
        <p className="text-xs text-muted">
          {t('squad.dataNote')} {updated ?? '—'}
        </p>
      </footer>
    </main>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-sm dark:shadow-none">
      <h3 className="mb-3 font-display text-lg font-semibold text-primary">{title}</h3>
      {children}
    </div>
  );
}
