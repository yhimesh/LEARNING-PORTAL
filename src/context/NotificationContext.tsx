import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { AppNotification, NotificationType } from '../types';
import {
  subscribeUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotification,
  CreateNotificationInput,
} from '../services/notificationService';
import { countUnreadNotifications } from '../utils/notificationUtils';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  notifyUser: (input: CreateNotificationInput) => Promise<string>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    // Real-time Firestore subscription on user's notifications collection
    const unsubscribe = subscribeUserNotifications(
      currentUser.uid,
      (list) => {
        setNotifications(list);
        setLoading(false);
      },
      (error) => {
        console.warn('Real-time notification subscription notice:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const unreadCount = countUnreadNotifications(notifications);

  const markAsRead = useCallback(async (id: string) => {
    await markNotificationAsRead(id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    await markAllNotificationsAsRead(notifications);
  }, [notifications]);

  const removeNotification = useCallback(async (id: string) => {
    await deleteNotification(id);
  }, []);

  const notifyUser = useCallback(async (input: CreateNotificationInput) => {
    return await createNotification(input);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        removeNotification,
        notifyUser,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
