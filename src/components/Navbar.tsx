import { useState } from 'react';
import {
  GraduationCap,
  Menu,
  X,
  Sparkles,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  Clock,
  Briefcase,
  HelpCircle,
  LifeBuoy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { NotificationDropdown } from './NotificationDropdown';
import { AuthModalMode } from '../types';

interface NavbarProps {
  onOpenAuth: (mode: AuthModalMode, initialRole?: 'Trainee' | 'Trainer') => void;
  activeSection: string;
  onOpenHelpCenter?: () => void;
  isHelpCenterActive?: boolean;
  onOpenMyTickets?: () => void;
}

export function Navbar({
  onOpenAuth,
  activeSection,
  onOpenHelpCenter,
  isHelpCenterActive,
  onOpenMyTickets,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, userProfile, logoutUser } = useAuth();
  const { notifications, unreadCount } = useNotifications();

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'courses', label: 'Explore Courses' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
  ];

  const displayName = userProfile?.fullName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const role = userProfile?.requestedRole || 'Trainee';
  const isPendingTrainer = role === 'Trainer' && userProfile?.accountStatus === 'pending';

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4 sm:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              scrollTo('home');
            }}
            className="flex items-center gap-2.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg py-1"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
                CAPACITY CONNECT
              </span>
              <span className="text-[10px] text-cyan-400 font-medium tracking-wider uppercase">
                Learn · Grow · Connect
              </span>
            </div>
          </a>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-slate-300"
          >
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo(link.id);
                }}
                className={`whitespace-nowrap transition-colors hover:text-cyan-400 py-1 border-b-2 ${
                  activeSection === link.id
                    ? 'text-cyan-400 border-cyan-400 font-semibold'
                    : 'border-transparent text-slate-300'
                }`}
              >
                {link.label}
              </a>
            ))}
            {currentUser && (
              <a
                href="#dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo('dashboard');
                }}
                className="whitespace-nowrap transition-colors hover:text-cyan-400 py-1 border-b-2 border-transparent text-cyan-300 flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </a>
            )}
            {onOpenHelpCenter && (
              <button
                type="button"
                onClick={onOpenHelpCenter}
                className={`whitespace-nowrap transition-colors hover:text-cyan-400 py-1 border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  isHelpCenterActive
                    ? 'text-cyan-400 border-cyan-400 font-semibold'
                    : 'border-transparent text-slate-300'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Help & FAQ</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Action & Auth Controls */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2.5">
                {/* Real-Time Notification Bell */}
                <NotificationDropdown
                  notifications={notifications}
                  unreadCount={unreadCount}
                  onNavigateToEntity={() => scrollTo('dashboard')}
                />

                {/* User Pill with Name & Role */}
                <button
                  type="button"
                  onClick={() => scrollTo('dashboard')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-left hover:border-cyan-500/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <div className="w-6 h-6 rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400 shrink-0">
                    {role === 'Trainer' ? <Briefcase className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white truncate max-w-[120px]">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      {role}
                      {isPendingTrainer && (
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> (Pending)
                        </span>
                      )}
                    </span>
                  </div>
                </button>

                {/* My Support Tickets Desk Button */}
                {onOpenMyTickets && (
                  <button
                    type="button"
                    onClick={onOpenMyTickets}
                    aria-label="My Support Tickets"
                    className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    title="My Support Tickets"
                  >
                    <LifeBuoy className="w-4 h-4" />
                  </button>
                )}

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={logoutUser}
                  aria-label="Sign Out of account"
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signin')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors border border-slate-700/80 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-lg transition-colors shadow-sm shadow-cyan-400/25 whitespace-nowrap flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>Get Started</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile menu hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            {currentUser && (
              <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                onNavigateToEntity={() => {
                  setMobileMenuOpen(false);
                  scrollTo('dashboard');
                }}
              />
            )}
            {!currentUser && (
              <button
                type="button"
                onClick={() => onOpenAuth('signin')}
                className="sm:hidden px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 rounded-md"
              >
                Sign In
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-3 pb-5 space-y-3">
          {currentUser && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-white">{displayName}</div>
                  <div className="text-xs text-slate-400 truncate">{currentUser.email}</div>
                  <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                    Role: {role} {isPendingTrainer && '(Pending Approval)'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logoutUser();
                  }}
                  className="p-2 text-slate-400 hover:text-rose-400 rounded-lg"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <nav aria-label="Mobile Navigation" className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo(link.id);
                }}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === link.id
                    ? 'bg-slate-800 text-cyan-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
            {currentUser && (
              <a
                href="#dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo('dashboard');
                }}
                className="px-3 py-2 rounded-md text-sm font-medium text-cyan-400 bg-cyan-950/40"
              >
                My Dashboard
              </a>
            )}
            {currentUser && onOpenMyTickets && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenMyTickets();
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors flex items-center gap-2"
              >
                <LifeBuoy className="w-4 h-4 text-cyan-400" />
                <span>My Support Tickets</span>
              </button>
            )}
            {onOpenHelpCenter && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenHelpCenter();
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  isHelpCenterActive
                    ? 'bg-slate-800 text-cyan-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Help Center & FAQ</span>
              </button>
            )}
          </nav>

          {!currentUser && (
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('signin');
                }}
                className="w-full py-2 px-3 text-center text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('register');
                }}
                className="w-full py-2 px-3 text-center text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
