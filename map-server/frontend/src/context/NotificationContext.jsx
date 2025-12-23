// frontend/src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import * as notificationApi from '../services/notificationApi';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const socket = useSocket();
  const { isLoggedIn, user } = useAuth();

  // State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState([]); // For toast notifications

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;

    try {
      setIsLoading(true);
      const data = await notificationApi.getNotifications({ limit: 50 });
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isLoggedIn) return;

    try {
      const data = await notificationApi.getUnreadCount();
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [isLoggedIn]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, []);

  // Add toast notification (auto-dismiss after 5 seconds)
  const addToast = useCallback((notification) => {
    const toastId = Date.now() + Math.random();
    const toast = { ...notification, toastId };
    
    setToasts(prev => [...prev, toast]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
    }, 5000);

    return toastId;
  }, []);

  // Dismiss a toast manually
  const dismissToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    if (!socket || !isLoggedIn) return;

    const handleNotification = (notification) => {
      console.log('📬 Received notification:', notification);

      // Add to notifications list
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast for push notifications
      addToast(notification);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, isLoggedIn, addToast]);

  // Fetch notifications on login
  useEffect(() => {
    if (isLoggedIn) {
      fetchNotifications();
      fetchUnreadCount();
    } else {
      // Clear on logout
      setNotifications([]);
      setUnreadCount(0);
      setToasts([]);
    }
  }, [isLoggedIn, fetchNotifications, fetchUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    isLoading,
    toasts,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    addToast,
    dismissToast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
