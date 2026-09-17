'use client';

import { useState, useMemo } from 'react';
import type { SeasonRow, MatchRow, CompGroup } from '@/lib/types';
import { rowsForGroup } from '@/lib/stats';
import { CompetitionTabs } from './CompetitionTabs';
import { KpiCards } from './KpiCards';
import { TrendCharts } from './TrendCharts';
import { SeasonTable } from './SeasonTable';
import { DataNote } from './DataNote';
import { useI18n } from '@/i18n/I18nContext';

export function Dashboard({ rows, matches }: { rows: SeasonRow[]; matches: MatchRow[] }) {
  const { t } = useI18n();
  const [group, setGroup] = useState<CompGroup>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const groupRows = useMemo(() => rowsForGroup(rows, group), [rows, group]);

  const changeGroup = (g: CompGroup) => {
    setGroup(g);
    setSelected(null);
  };

  const toggleSeason = (season: string) =>
    setSelected((prev) => (prev === season ? null : season));

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-6 py-8 lg:px-10">
      <section className="flex min-w-0 flex-col gap-4">
        <CompetitionTabs group={group} onChange={changeGroup} />
        <KpiCards rows={groupRows} />
      </section>

      <section className="flex min-w-0 flex-col gap-4">
        <TrendCharts rows={groupRows} />
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <SeasonTable
          rows={groupRows}
          group={group}
          selectedSeason={selected}
          onSelect={toggleSeason}
          matches={matches}
        />
        <p className="text-xs text-muted">{t('table.hint')}</p>
      </section>

      <footer>
        <DataNote />
      </footer>
    </main>
  );
}
