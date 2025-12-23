// frontend/src/components/NotificationToast.jsx
import React from 'react';
import { useNotification } from '../context/NotificationContext';
import './Notification.css';

// Icon mapping for different notification types
const getNotificationIcon = (type) => {
  switch (type) {
    case 'droplets_earned':
      return '💧';
    case 'droplets_spent':
      return '💸';
    case 'payment_success':
      return '✅';
    case 'team_member_joined':
      return '👋';
    case 'team_member_left':
      return '👤';
    case 'challenge_completed':
      return '🏆';
    case 'badge_earned':
      return '🎖️';
    default:
      return '🔔';
  }
};

const NotificationToast = () => {
  const { toasts, dismissToast } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div className="notification-toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.toastId}
          className={`notification-toast notification-toast-${toast.type}`}
          onClick={() => dismissToast(toast.toastId)}
        >
          <div className="notification-toast-icon">
            {getNotificationIcon(toast.type)}
          </div>
          <div className="notification-toast-content">
            <div className="notification-toast-title">{toast.title}</div>
            <div className="notification-toast-message">{toast.message}</div>
          </div>
          <button
            className="notification-toast-close"
            onClick={(e) => {
              e.stopPropagation();
              dismissToast(toast.toastId);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
