import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCircle2, AlertCircle, Info, ShieldAlert, Check } from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/audio';
import { SystemNotification } from '../types';

interface NotificationsModalProps {
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      sound.playTap();
      await api.markNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const getIcon = (type: SystemNotification['type']) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'ALERT':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'WARNING':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-md h-[520px] bg-slate-900 border border-slate-700 rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-scaleUp text-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Notifications & Security Alerts
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleMarkAllRead}
              title="Mark all as read"
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Read</span>
            </button>
            <button
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs">
          {loading ? (
            <p className="text-center py-16 text-slate-500">Loading alerts...</p>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border flex items-start space-x-3 transition-colors ${
                  n.read
                    ? 'bg-slate-950/60 border-slate-800/60 text-slate-400'
                    : 'bg-slate-950 border-emerald-500/30 text-slate-200 shadow-sm'
                }`}
              >
                <div className="shrink-0 mt-0.5">{getIcon(n.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-white text-xs">{n.title}</h5>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                    {n.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
