import { Award, BookOpen, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

export function BenefitsSection() {
  const benefits = [
    {
      id: 'skill-dev',
      title: 'Skill Development',
      badge: 'Competency Focus',
      icon: Award,
      description:
        'Industry-tailored technical pathways spanning Programming, AI/ML, Cloud Databases, and Algorithms designed to elevate job-readiness for emerging engineering talent.',
      features: [
        'Hands-on coding challenges and real-world problem statements',
        'Standardized curricula aligned with modern technology requirements',
        'Bridging the academic theory to practical application gap',
      ],
    },
    {
      id: 'learning-resources',
      title: 'Learning Resources',
      badge: 'Open Curriculum',
      icon: BookOpen,
      description:
        'Comprehensive modular content featuring structured syllabi, curated documentation, reference guides, and multimedia learning materials accessible on demand.',
      features: [
        'Organized modules from beginner to intermediate levels',
        'Clear prerequisites and learning outcomes for each course',
        'Downloadable checklists and structured study plans',
      ],
    },
    {
      id: 'assessments',
      title: 'Assessments',
      badge: 'Evaluation Framework',
      icon: CheckCircle2,
      description:
        'Formative quizzes, concept checks, and project rubrics that measure comprehension at each milestone and validate key learning outcomes.',
      features: [
        'Self-check quizzes after each completed topic',
        'Objective-based milestone checks to reinforce retention',
        'Blueprint for automated grading and skill certification',
      ],
    },
    {
      id: 'progress-tracking',
      title: 'Progress Tracking',
      badge: 'Analytics & Growth',
      icon: TrendingUp,
      description:
        'Intuitive milestone indicators and learning analytics that keep students motivated and provide educators with clear visibility into capacity building achievements.',
      features: [
        'Personal learning roadmap and time spent analytics',
        'Module completion indicators and progress percentages',
        'Transparent milestones designed for continuous improvement',
      ],
    },
  ];

  return (
    <section id="benefits" className="bg-slate-950 text-slate-100 py-16 sm:py-20 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-cyan-950/60 border border-cyan-800/60 text-xs font-semibold text-cyan-400 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digital Capacity Building Pillars</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Why CAPACITY CONNECT?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Four foundational pillars built into the platform architecture to ensure effective learning outcomes, scalable institutional training, and verifiable skill growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 hover:border-cyan-500/50 transition-all shadow-sm flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-cyan-400/90 font-mono">
                      {benefit.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                    {benefit.title}
                  </h3>

                  <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                    {benefit.description}
                  </p>

                  <div className="mt-5 pt-5 border-t border-slate-800/80 space-y-2.5">
                    {benefit.features.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                        <span className="leading-normal">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
