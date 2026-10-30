import { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  FileCheck2,
  BookOpen,
  X,
  ExternalLink,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AppNotification, NotificationType } from '../types';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../services/notificationService';
import { filterNotifications, formatNotificationDate } from '../utils/notificationUtils';

interface NotificationDropdownProps {
  notifications: AppNotification[];
  unreadCount: number;
  onNavigateToEntity?: (type: string, id?: string) => void;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  onNavigateToEntity,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const displayedList = filterNotifications(notifications, filter);

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
    if (notif.relatedEntityId && onNavigateToEntity) {
      onNavigateToEntity(notif.type, notif.relatedEntityId);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(notifications);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  // Icon mapping helper
  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'enrollment_success':
      case 'new_enrollment':
        return <GraduationCap className="w-4 h-4 text-cyan-400" />;
      case 'trainer_approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'trainer_pending_review':
        return <Briefcase className="w-4 h-4 text-amber-400" />;
      case 'assessment_result':
      case 'assessment_submitted':
        return <FileCheck2 className="w-4 h-4 text-purple-400" />;
      case 'new_resource':
        return <BookOpen className="w-4 h-4 text-blue-400" />;
      default:
        return <Bell className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-850 rounded-xl transition-all border border-slate-800 hover:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-extrabold flex items-center justify-center shadow-md shadow-cyan-400/40 animate-pulse font-mono">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div
          role="region"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 focus:outline-none"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg focus:outline-none"
                aria-label="Close notifications dropdown"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3.5 py-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors text-[11px] ${
                filter === 'all'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-lg transition-colors text-[11px] ${
                filter === 'unread'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-800/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-800/50">
            {displayedList.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-2.5">
                  <Bell className="w-5 h-5 text-slate-600" />
                </div>
                <div className="text-xs font-semibold text-slate-300">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {filter === 'unread'
                    ? 'All alerts have been reviewed.'
                    : 'Events like enrollments, approvals, and quiz results will appear here.'}
                </p>
              </div>
            ) : (
              displayedList.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 sm:p-4 text-left transition-colors cursor-pointer flex items-start gap-3 group relative ${
                    notif.isRead
                      ? 'bg-slate-900/40 hover:bg-slate-850/60'
                      : 'bg-slate-900/90 hover:bg-slate-850 border-l-2 border-l-cyan-400'
                  }`}
                >
                  {/* Type Icon Pill */}
                  <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    {getIconForType(notif.type)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-xs font-semibold truncate ${notif.isRead ? 'text-slate-300' : 'text-white'}`}>
                        {notif.title}
                      </span>
                      {!notif.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-mono">
                      <span>{formatNotificationDate(notif.createdAt)}</span>
                      {notif.relatedEntityId && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-400/80 group-hover:text-cyan-300 flex items-center gap-0.5">
                            <span>View details</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Delete Action Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, notif.id)}
                    aria-label="Delete notification"
                    className="absolute right-3 top-3 text-slate-500 hover:text-rose-400 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                    title="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-2.5 bg-slate-950/70 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono">
            CAPACITY CONNECT Real-Time Alert Engine
          </div>
        </div>
      )}
    </div>
  );
}
