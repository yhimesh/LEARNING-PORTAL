import { Target, Layers, ShieldCheck, Cpu } from 'lucide-react';

export function AboutSection() {
  const objectives = [
    {
      icon: Target,
      title: 'Institutional Capacity Building',
      description:
        'Enable colleges and universities to provide standardized, high-quality digital training modules that complement traditional classroom curricula.',
    },
    {
      icon: Cpu,
      title: 'Industry-Aligned Competencies',
      description:
        'Bridge the gap between theoretical knowledge and practical workplace skills through focused programming, AI/ML, and data fundamentals.',
    },
    {
      icon: Layers,
      title: 'Modular & Scalable Architecture',
      description:
        'Engineered with clean React and TypeScript separation, seamlessly integrated with Firebase Auth and Cloud Firestore.',
    },
    {
      icon: ShieldCheck,
      title: 'Empowering Individual Learners',
      description:
        'Accessible, self-paced learning pathways designed to support students from tier-2 and tier-3 colleges with open access to skill building.',
    },
  ];

  return (
    <section id="about" className="bg-slate-900 text-slate-100 py-16 sm:py-20 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Mission & Problem Statement */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 border border-slate-700/80 text-xs font-semibold text-cyan-400">
              <span>About The Project</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              About CAPACITY CONNECT
            </h2>

            <div className="space-y-4 text-sm sm:text-base text-slate-300 leading-relaxed">
              <p>
                <strong>CAPACITY CONNECT</strong> is conceptualized and built for <strong>Smart India Hackathon Problem Statement SIH26075: A Digital Capacity Building and Learning Management Portal</strong>.
              </p>
              <p>
                In an era of accelerated technological evolution, conventional academic curricula often struggle to keep pace with dynamic industry demands. CAPACITY CONNECT addresses this disparity by establishing a centralized, accessible digital learning portal where learners can master fundamental and advanced technical skills at their own pace.
              </p>
              <p>
                This college project is developed by an individual student engineer, adopting a disciplined multi-stage software engineering roadmap:
              </p>
            </div>

            {/* Engineering Roadmap Timeline */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Development Roadmap
              </h3>
              
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-400 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <strong className="text-white">Frontend Architecture & UI</strong>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Responsive UI, course catalogue, live search and category filtering, course details modal, and contact form validation with sample data.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 border border-slate-700">
                    2
                  </div>
                  <div>
                    <strong className="text-slate-200">Backend & Authentication</strong>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Firebase Authentication (Student/Trainer roles), Cloud Firestore real-time persistence, and learner enrollment records.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 border border-slate-700">
                    3
                  </div>
                  <div>
                    <strong className="text-slate-200">Assessments & Analytics</strong>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Interactive quizzes, institutional capacity reports, progress certificates, and mentor dashboards.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Key Goals Grid */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {objectives.map((obj, idx) => {
              const Icon = obj.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 mb-3.5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {obj.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    {obj.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
