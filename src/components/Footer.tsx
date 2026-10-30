import { GraduationCap, ArrowUp, HelpCircle } from 'lucide-react';

interface FooterProps {
  onOpenHelpCenter?: () => void;
}

export function Footer({ onOpenHelpCenter }: FooterProps) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-900">
          {/* Brand & Project Info */}
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                CAPACITY CONNECT
              </span>
            </div>
            <p className="text-xs text-cyan-400 font-medium tracking-wide uppercase">
              Learn · Grow · Connect
            </p>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              A Digital Capacity Building and Learning Management Portal developed for <strong>Smart India Hackathon Problem Statement SIH26075</strong>. Designed to empower students and institutions through structured competency pathways.
            </p>
          </div>

          {/* Quick Navigation Links */}
          <div className="md:col-span-6 space-y-3 md:pl-10">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Navigation
            </h3>
            <ul className="space-y-2 text-xs grid grid-cols-2 gap-x-6 gap-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('home')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('courses')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Explore Courses
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('benefits')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Core Benefits
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('about')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  About SIH26075
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('contact')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Contact Form
                </button>
              </li>
              {onOpenHelpCenter && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenHelpCenter}
                    className="hover:text-cyan-400 transition-colors text-cyan-300 font-medium flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Help Center & FAQ</span>
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            &copy; {new Date().getFullYear()} CAPACITY CONNECT · College Project Prototype (SIH26075). All rights reserved.
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Scroll back to top of page"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>
    </footer>
  );
}
