import { getTranslations } from 'next-intl/server';

/**
 * Erasmus+ co-funding acknowledgment footer.
 * Required by EU funding rules — must be visible on every public page.
 *
 * The badge here follows the official EU Visibility Manual composition:
 *   • EU emblem (12 yellow stars on blue) on the LEFT
 *   • "Co-funded by the European Union" wordmark on the RIGHT in EU blue
 *   • Both on a white background with clear-space padding (the manual's
 *     minimum is the height of one star around the emblem).
 * Implemented as inline SVG + HTML so it scales perfectly and stays sharp
 * on retina displays without an image asset dependency.
 */
export async function EuFooter() {
  const t = await getTranslations('Footer');

  return (
    <footer className="relative z-10 mt-auto border-t border-border bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Official "Co-funded by the European Union" badge.
              Always rendered on a white card — EU Visual Identity Manual
              requires a light background for the emblem to remain legible. */}
          <div className="shrink-0 inline-flex items-center gap-3 rounded-md bg-white p-3 shadow-soft">
            <svg
              viewBox="0 0 60 40"
              width="96"
              height="64"
              role="img"
              aria-label="European Union emblem"
              className="rounded-sm shrink-0"
            >
              <rect width="60" height="40" fill="#003399" />
              {/* 12 stars in a circle */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const cx = 30 + Math.cos(angle) * 13;
                const cy = 20 + Math.sin(angle) * 13;
                return (
                  <g key={i} transform={`translate(${cx} ${cy})`}>
                    <polygon
                      points="0,-2.4 0.7,-0.7 2.4,-0.7 1.0,0.4 1.5,2.0 0,1.1 -1.5,2.0 -1.0,0.4 -2.4,-0.7 -0.7,-0.7"
                      fill="#FFCC00"
                    />
                  </g>
                );
              })}
            </svg>
            {/* Wordmark on the right — EU blue, sans-serif, two lines, tight
                line-height to match the manual's reference proportions. */}
            <div
              className="flex flex-col font-bold text-[#003399] text-base leading-[1.05] tracking-tight"
              aria-label="Co-funded by the European Union"
            >
              <span>Co-funded by</span>
              <span>the European Union</span>
            </div>
          </div>

          <div className="flex-1 text-base leading-relaxed text-muted">
            <p className="font-bold text-foreground text-lg">{t('cofundedTitle')}</p>
            <p className="mt-1.5">{t('cofundedBody')}</p>
            <p className="mt-3 text-sm leading-relaxed">{t('disclaimer')}</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row gap-3 justify-between text-xs text-muted">
          <p>
            © 2026 Spółdzielnia Socjalna Zielone Śląskie · EURO-NET ·{' '}
            <span className="text-foreground font-medium">Project ID 101245857</span>
          </p>
          <p className="flex items-center gap-6 flex-wrap">
            <a
              href="https://erasmus-plus.ec.europa.eu/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand underline underline-offset-4 inline-flex items-center min-h-11 px-2"
            >
              Erasmus+ Sport
            </a>
            <a
              href="https://github.com/Klaster1234/fitgenerations"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand underline underline-offset-4 inline-flex items-center min-h-11 px-2"
            >
              Open source
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
