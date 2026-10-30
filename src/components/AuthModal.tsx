import { useEffect, useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Loader2,
  KeyRound,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import { AuthModalState, AuthModalMode } from '../types';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  authModal: AuthModalState;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ authModal, onClose, onSuccess }: AuthModalProps) {
  const { registerUser, loginUser, resetUserPassword } = useAuth();

  const [mode, setMode] = useState<AuthModalMode>('signin');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState<'Trainee' | 'Trainer'>('Trainee');

  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Sync mode with prop when opened
  useEffect(() => {
    if (authModal.isOpen) {
      setMode(authModal.mode);
      if (authModal.initialRole) {
        setRequestedRole(authModal.initialRole);
      }
      setErrorMessage(null);
      setResetSuccessMessage(null);
    }
  }, [authModal.isOpen, authModal.mode, authModal.initialRole]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (authModal.isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [authModal.isOpen, onClose]);

  if (!authModal.isOpen) return null;

  const translateFirebaseError = (err: unknown): string => {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password') || message.includes('auth/user-not-found')) {
      return 'Incorrect email or password. Please verify your credentials and try again.';
    }
    if (message.includes('auth/email-already-in-use')) {
      return 'An account with this email address already exists. Please sign in or reset your password.';
    }
    if (message.includes('auth/weak-password')) {
      return 'Password is too weak. Please use at least 6 characters.';
    }
    if (message.includes('auth/invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (message.includes('auth/too-many-requests')) {
      return 'Access temporarily blocked due to multiple failed login attempts. Please reset your password or try again later.';
    }
    if (message.includes('auth/network-request-failed')) {
      return 'Network connection issue. Please check your internet connection.';
    }
    return message;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Full name must be at least 2 characters.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      await registerUser(fullName, email, password, requestedRole);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(translateFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      await loginUser(email, password);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(translateFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResetSuccessMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address to send the reset link.');
      return;
    }

    setSubmitting(true);
    try {
      await resetUserPassword(email);
      setResetSuccessMessage(
        `Password reset link has been dispatched to ${email.trim()}. Please check your email inbox and spam folder.`
      );
    } catch (err) {
      setErrorMessage(translateFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-100 my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication dialog"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Tabs */}
        {mode !== 'forgot-password' ? (
          <div>
            <h2 id="auth-modal-title" className="sr-only">
              {mode === 'signin' ? 'Sign in to Capacity Connect' : 'Register for Capacity Connect'}
            </h2>
            <div className="flex border-b border-slate-800 mb-6 pb-2">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className={`pb-2.5 px-4 text-sm font-semibold transition-colors border-b-2 -mb-2.5 ${
                  mode === 'signin'
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className={`pb-2.5 px-4 text-sm font-semibold transition-colors border-b-2 -mb-2.5 ${
                  mode === 'register'
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Register
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-xl font-bold text-white tracking-tight">
                Reset Password
              </h2>
              <p className="text-xs text-slate-400">
                Receive a secure password reset link via email
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            id="auth-error-msg"
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Reset Success Alert */}
        {resetSuccessMessage && (
          <div
            role="status"
            className="mb-5 p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-xs text-emerald-300 flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{resetSuccessMessage}</span>
          </div>
        )}

        {/* Sign In Form */}
        {mode === 'signin' && (
          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu"
                  required
                  aria-describedby={errorMessage ? 'auth-error-msg' : undefined}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot-password');
                    setErrorMessage(null);
                    setResetSuccessMessage(null);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  aria-describedby={errorMessage ? 'auth-error-msg' : undefined}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-cyan-400/20 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Registration Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="register-name"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  required
                  aria-describedby={errorMessage ? 'auth-error-msg' : undefined}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu"
                  required
                  aria-describedby={errorMessage ? 'auth-error-msg' : undefined}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="register-password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    required
                    aria-describedby={errorMessage ? 'auth-error-msg' : undefined}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 rounded-xl text-base sm:text-xs text-white placeholder-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="register-confirm-password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="register-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    aria-describedby={errorMessage ? 'auth-error-msg' : undefined}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 rounded-xl text-base sm:text-xs text-white placeholder-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Role Selection: Only Trainee or Trainer allowed */}
            <div>
              <span id="role-selection-label" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Registering As (Role)
              </span>
              <div role="radiogroup" aria-labelledby="role-selection-label" className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  role="radio"
                  aria-checked={requestedRole === 'Trainee'}
                  onClick={() => setRequestedRole('Trainee')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    requestedRole === 'Trainee'
                      ? 'border-cyan-400 bg-cyan-950/40 text-white ring-1 ring-cyan-400/50'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <GraduationCap className={`w-4 h-4 ${requestedRole === 'Trainee' ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase">Immediate</span>
                  </div>
                  <div className="font-semibold text-xs text-white">Trainee / Student</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Active right away</p>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={requestedRole === 'Trainer'}
                  onClick={() => setRequestedRole('Trainer')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    requestedRole === 'Trainer'
                      ? 'border-cyan-400 bg-cyan-950/40 text-white ring-1 ring-cyan-400/50'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Briefcase className={`w-4 h-4 ${requestedRole === 'Trainer' ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="text-[10px] font-semibold text-amber-400 uppercase">Approval</span>
                  </div>
                  <div className="font-semibold text-xs text-white">Trainer / Faculty</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Pending admin review</p>
                </button>
              </div>

              {requestedRole === 'Trainer' && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-[11px] text-amber-300 flex items-start gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Trainer profiles are created in <strong>pending</strong> status until an authorized administrator verifies credentials.
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-3 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-cyan-400/20 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Forgot Password Flow */}
        {mode === 'forgot-password' && (
          <form onSubmit={handlePasswordReset} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="reset-email"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Registered Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu"
                  required
                  aria-describedby={errorMessage ? 'auth-error-msg' : undefined}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-cyan-400/20 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                  setResetSuccessMessage(null);
                }}
                className="text-xs text-slate-400 hover:text-cyan-400 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
