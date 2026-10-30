import { ArrowRight, BookOpen, Layers, ShieldCheck, Sparkles } from 'lucide-react';

interface HeroProps {
  onExploreCourses: () => void;
  onLearnMore: () => void;
}

export function Hero({ onExploreCourses, onLearnMore }: HeroProps) {
  return (
    <section id="home" className="relative overflow-hidden bg-slate-950 text-slate-100 pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-800">
      {/* Subtle background ambient gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Core Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Hero Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] text-balance">
              Build Skills.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400">
                Unlock Opportunities.
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              CAPACITY CONNECT is a digital capacity building and learning management portal engineered to democratize access to standardized technical education. Empowering students, educators, and institutions with structured curricula, verified competency pathways, and industry-aligned skill building.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onExploreCourses}
                className="px-6 py-3 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-xl transition-all shadow-lg shadow-cyan-400/20 flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <span>Explore Courses</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={onLearnMore}
                className="px-6 py-3 text-sm font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                Project Overview
              </button>
            </div>

            {/* Key Value Points */}
            <div className="pt-4 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Verified Curriculum</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Self-Paced Learning</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Open Digital Access</span>
              </div>
            </div>
          </div>

          {/* Right Column: Portal Architecture Interactive Preview Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-7 border border-slate-800 shadow-2xl shadow-cyan-950/30">
              {/* Header inside card */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-medium text-slate-400 font-mono">
                    capacity-portal.v1
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                  <Sparkles className="w-3 h-3" />
                  <span>CAPACITY CONNECT</span>
                </div>
              </div>

              {/* Card Body: Interactive Architecture Visualizer */}
              <div className="mt-5 space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span className="font-semibold text-slate-200">Curriculum Foundation</span>
                    <span className="text-cyan-400 font-mono">6 Core Disciplines</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Programming, AI/ML, Web Systems, Databases, and Algorithmic Design.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span className="font-semibold text-slate-200">Capacity Building Metrics</span>
                    <span className="text-cyan-400 font-mono">Illustrative</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full w-3/4 rounded-full" />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                    <span>Frontend Architecture</span>
                    <span className="text-cyan-400 font-medium">Ready</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-800/40">
                  <div className="text-xs font-medium text-cyan-300">
                    Smart India Hackathon Prototype
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    Built for SIH26075: Digital Capacity Building and Learning Management Portal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
