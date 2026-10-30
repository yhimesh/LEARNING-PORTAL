import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SupportTicketCategory } from '../types';
import { createSupportTicket } from '../services/ticketService';
import { SUPPORT_CATEGORIES, validateSupportTicketInput } from '../utils/ticketUtils';
import {
  Send,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  LifeBuoy,
  Loader2,
  LogIn,
  ExternalLink,
} from 'lucide-react';

interface ContactSectionProps {
  onOpenMyTickets?: () => void;
  onOpenAuth?: (mode: 'signin') => void;
}

export function ContactSection({ onOpenMyTickets, onOpenAuth }: ContactSectionProps) {
  const { currentUser, userProfile } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    category?: string;
    subject?: string;
    message?: string;
  }>({});

  const [submitting, setSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<{
    ticketNumber: string;
    ticketId: string;
    subject: string;
  } | null>(null);

  // Pre-fill user profile info when logged in
  useEffect(() => {
    if (currentUser) {
      if (userProfile?.fullName) setName(userProfile.fullName);
      else if (currentUser.displayName) setName(currentUser.displayName);
      if (currentUser.email) setEmail(currentUser.email);
    }
  }, [currentUser, userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketResult(null);

    // Validation
    const validation = validateSupportTicketInput({
      userId: currentUser?.uid || 'guest-inquiry',
      userName: name,
      userEmail: email,
      subject,
      category,
      message,
    });

    if (!validation.isValid) {
      setErrors({
        name: validation.errors.userName,
        email: validation.errors.userEmail,
        category: validation.errors.category,
        subject: validation.errors.subject,
        message: validation.errors.message,
      });
      return;
    }

    setErrors({});

    // If user is not authenticated, prompt sign-in to track ticket
    if (!currentUser) {
      if (onOpenAuth) {
        onOpenAuth('signin');
        return;
      }
    }

    setSubmitting(true);

    try {
      const created = await createSupportTicket({
        userId: currentUser!.uid,
        userName: name.trim(),
        userEmail: email.trim().toLowerCase(),
        subject: subject.trim(),
        category,
        message: message.trim(),
      });

      setTicketResult({
        ticketNumber: created.ticketNumber || created.requestId,
        ticketId: created.id,
        subject: created.subject,
      });

      // Clear non-profile inputs
      setSubject('');
      setMessage('');
      setCategory('general');
    } catch (err: any) {
      console.error('Failed to submit contact ticket:', err);
      setErrors({ message: err?.message || 'Failed to submit inquiry. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (!currentUser) {
      setName('');
      setEmail('');
    }
    setSubject('');
    setMessage('');
    setCategory('general');
    setErrors({});
    setTicketResult(null);
  };

  return (
    <section id="contact" className="bg-slate-950 text-slate-100 py-16 sm:py-20 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-cyan-950/60 border border-cyan-800/60 text-xs font-semibold text-cyan-400 mb-3">
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Contact Support Desk</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Get in Touch with Faculty Support
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Have questions regarding course access, trainer onboarding, technical bugs, or curriculum resources? Submit a tracked support ticket below.
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            {/* Success Banner when ticket is logged */}
            {ticketResult && (
              <div
                role="status"
                aria-live="polite"
                className="mb-6 p-5 rounded-2xl bg-slate-950 border border-emerald-500/60 text-slate-200 text-xs sm:text-sm space-y-3 shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm">
                      Support Ticket Logged: <span className="text-cyan-400 font-mono">#{ticketResult.ticketNumber}</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Your inquiry has been recorded in Cloud Firestore. Our administrative team will review your ticket and reply directly in your Support Desk conversation thread.
                    </p>
                  </div>
                </div>

                {onOpenMyTickets && (
                  <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                    <button
                      type="button"
                      onClick={onOpenMyTickets}
                      className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors inline-flex items-center gap-1.5"
                    >
                      <LifeBuoy className="w-3.5 h-3.5" />
                      <span>View in My Support Tickets</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Guest notice if unauthenticated */}
            {!currentUser && (
              <div className="mb-6 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-slate-200 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    Sign in to track your ticket status, receive notifications, and converse directly with faculty support.
                  </span>
                </div>
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => onOpenAuth('signin')}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1 shrink-0"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Row 1: Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    placeholder="e.g. Aarav Sharma"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'contact-name-error' : undefined}
                    className={`w-full px-3.5 py-2.5 bg-slate-950 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.name ? 'border-rose-500/80 focus:ring-rose-400' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  />
                  {errors.name && (
                    <p id="contact-name-error" role="alert" className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    placeholder="e.g. learner@college.edu"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'contact-email-error' : undefined}
                    className={`w-full px-3.5 py-2.5 bg-slate-950 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      errors.email ? 'border-rose-500/80 focus:ring-rose-400' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  />
                  {errors.email && (
                    <p id="contact-email-error" role="alert" className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="contact-category"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Issue Category <span className="text-rose-400">*</span>
                </label>
                <select
                  id="contact-category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as SupportTicketCategory);
                    if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
                  }}
                  aria-invalid={Boolean(errors.category)}
                  aria-describedby={errors.category ? 'contact-category-error' : undefined}
                  className="w-full px-3.5 py-2.5 bg-slate-950 rounded-xl text-base sm:text-sm text-white border border-slate-800 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  {SUPPORT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label} ({cat.description})
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p id="contact-category-error" role="alert" className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.category}</span>
                  </p>
                )}
              </div>

              {/* Subject */}
              <div>
                <label
                  htmlFor="contact-subject"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Subject <span className="text-rose-400">*</span>
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }));
                  }}
                  placeholder="e.g. Issue submitting Assessment Attempt in Python Foundations"
                  maxLength={150}
                  aria-invalid={Boolean(errors.subject)}
                  aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                  className={`w-full px-3.5 py-2.5 bg-slate-950 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    errors.subject ? 'border-rose-500/80 focus:ring-rose-400' : 'border-slate-800 hover:border-slate-700'
                  }`}
                />
                {errors.subject && (
                  <p id="contact-subject-error" role="alert" className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.subject}</span>
                  </p>
                )}
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Message <span className="text-rose-400">*</span>
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }));
                  }}
                  placeholder="Describe your inquiry, steps to reproduce any issue, or account details..."
                  maxLength={2000}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? 'contact-message-error' : undefined}
                  className={`w-full px-3.5 py-2.5 bg-slate-950 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    errors.message ? 'border-rose-500/80 focus:ring-rose-400' : 'border-slate-800 hover:border-slate-700'
                  }`}
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>At least 10 characters</span>
                  <span>{message.length} / 2000</span>
                </div>
                {errors.message && (
                  <p id="contact-message-error" role="alert" className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.message}</span>
                  </p>
                )}
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-xl transition-colors shadow-md shadow-cyan-400/20 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Logging Support Ticket...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Support Ticket</span>
                    </>
                  )}
                </button>

                {(subject || message || ticketResult) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Form</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
