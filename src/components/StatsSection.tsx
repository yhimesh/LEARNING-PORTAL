import { Users, BookOpen, Clock, Globe } from 'lucide-react';

export function StatsSection() {
  const stats = [
    {
      icon: Users,
      value: '10,000+',
      label: 'Target Learner Reach',
      note: 'Illustrative institutional capacity target for college & university rollout',
    },
    {
      icon: BookOpen,
      value: '6 Modules',
      label: 'Curriculum Baseline',
      note: 'Foundational subjects covering core computer science disciplines',
    },
    {
      icon: Clock,
      value: '120+ Hours',
      label: 'Interactive Content Blueprint',
      note: 'Structured self-paced learning duration across introductory courses',
    },
    {
      icon: Globe,
      value: '24 / 7',
      label: 'Digital Access',
      note: 'Open, cloud-native learning availability without geographical barriers',
    },
  ];

  return (
    <section className="bg-slate-900 border-b border-slate-800 text-slate-100 py-12 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-block px-3 py-1 rounded-md bg-slate-800 border border-slate-700/80 text-[11px] font-medium text-cyan-400 uppercase tracking-wider mb-2">
            Illustrative Project Metrics
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Target Metrics & Educational Capacity Blueprint
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            *Figures shown below are clearly defined illustrative capacity projections designed for this academic demonstration (SIH26075).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-5 hover:border-cyan-500/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-cyan-400 border border-slate-800">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-300 uppercase tracking-wider">
                    Target
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-200">
                  {stat.label}
                </div>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  {stat.note}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
