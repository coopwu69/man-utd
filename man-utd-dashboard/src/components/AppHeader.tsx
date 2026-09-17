'use client';

import { Sun, Moon } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { useTheme } from './ThemeProvider';

export function AppHeader({ seasonRange }: { seasonRange: string }) {
  const { lang, setLang, t } = useI18n();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="truncate font-display text-lg font-bold leading-none tracking-tight text-primary sm:text-2xl">
            {t('app.title')}
          </h1>
          <p className="truncate text-xs text-muted sm:text-sm">
            {t('app.subtitle')} · {seasonRange}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full bg-bg-secondary p-1">
            <button
              type="button"
              onClick={() => setLang('th')}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                lang === 'th'
                  ? 'bg-surface-elevated text-brand shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
              aria-pressed={lang === 'th'}
            >
              {t('lang.th')}
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                lang === 'en'
                  ? 'bg-surface-elevated text-brand shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
              aria-pressed={lang === 'en'}
            >
              {t('lang.en')}
            </button>
          </div>

          <button
            type="button"
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-secondary text-primary transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
