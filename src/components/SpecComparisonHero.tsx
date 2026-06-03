import type { SpecComparisonConfig } from '@/lib/types';

type SpecComparisonHeroProps = {
  collectionName: string;
  config: SpecComparisonConfig;
};

function emphasisBorder(emphasis: 'high' | 'medium' | 'low') {
  if (emphasis === 'high') return 'border-l-2 border-emerald-500 pl-3';
  return 'pl-3';
}

export function SpecComparisonHero({
  collectionName,
  config,
}: SpecComparisonHeroProps) {
  return (
    <div className="w-full space-y-0 rounded-3xl bg-slate-900 text-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
          {collectionName}
        </p>
        <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
          {config.headline}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          {config.subheadline}
        </p>
      </div>

      {/* Spec Comparison Table */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Industry Standard Column */}
        <div className="border-t border-slate-700 bg-slate-800/50 px-6 py-5 sm:px-10">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Most Commonly Stocked Alternative
          </h3>
          <div className="mt-4 space-y-4">
            {config.specs.map((spec) => (
              <div key={spec.label} className={emphasisBorder(spec.emphasis)}>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {spec.label}
                </p>
                <p className="mt-0.5 text-lg font-semibold text-zinc-400">
                  {spec.industryStandard.value}
                </p>
                <p className="text-xs text-zinc-600">
                  {spec.industryStandard.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Professional Spec Column */}
        <div className="border-t border-slate-700 bg-slate-900 px-6 py-5 sm:px-10">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Professional Specification
          </h3>
          <div className="mt-4 space-y-4">
            {config.specs.map((spec) => (
              <div key={spec.label} className={emphasisBorder(spec.emphasis)}>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {spec.label}
                </p>
                <p className="mt-0.5 text-lg font-semibold text-white">
                  {spec.professionalSpec.value}
                </p>
                <p className="text-xs text-emerald-400/70">
                  {spec.professionalSpec.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: When to Use + ROI */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-t border-slate-700">
        {/* When to Specify */}
        <div className="px-6 py-6 sm:px-10">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            When to Specify
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {config.whenToUse.map((scenario) => (
              <div
                key={scenario.label}
                className="rounded-lg bg-slate-800 px-4 py-3"
              >
                <p className="text-sm font-semibold text-white">
                  {scenario.label}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {scenario.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ROI Callout */}
        <div className="px-6 py-6 sm:px-10">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              {config.roiCallout.headline}
            </h3>
            <ul className="mt-3 space-y-2">
              {config.roiCallout.bullets.map((bullet, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-300"
                >
                  <span className="mt-1.5 block h-1 w-1 flex-shrink-0 rounded-full bg-emerald-500" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
