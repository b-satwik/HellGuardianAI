import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { AlertTriangle, Bell, Check, Trash2, X } from 'lucide-react';

export interface AlertNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'EMERGENCY';
  timestamp: string;
  read: boolean;
}

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(collection(db, `users/${user.uid}/notifications`), (snap) => {
      const items = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AlertNotification));
      // Sort by newest first
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(items);
    });

    return () => unsub();
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/notifications`, id), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/notifications`, id));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative z-50">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative border border-[#12344A] bg-[#091019] hover:bg-[#00D4FF]/10 text-[#00D4FF] hover:text-[#7DF9FF] p-2 flex items-center justify-center transition-all duration-300"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#FF4040] text-[#EAF7FF] text-[8px] font-bold px-1 rounded-full animate-pulse border border-[#FF4040] shadow-[0_0_5px_rgba(255,64,64,0.6)]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popout Overlay Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[#091019] border-2 border-[#12344A] shadow-xl shadow-black/90 p-4 font-mono select-none">
          <div className="flex justify-between items-center border-b border-[#12344A] pb-2 mb-3">
            <span className="text-xs font-bold text-[#00D4FF] tracking-wider">WORKSPACE ALARMS</span>
            <button
              onClick={() => setOpen(false)}
              className="text-[#4f94c4] hover:text-[#FF4040]"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-6 text-[10px] text-[#4f94c4] tracking-wider uppercase">
                NO ACTIVE ALERTS AND DIRECTIVES.
              </div>
            ) : (
              notifications.map((notif) => {
                const isEmergency = notif.type === 'EMERGENCY';
                const isWarning = notif.type === 'WARNING';
                return (
                  <div
                    key={notif.id}
                    className={`border p-3 text-xs leading-normal relative flex flex-col gap-2 ${
                      isEmergency 
                        ? 'border-[#FF4040] bg-[#FF4040]/5' 
                        : isWarning 
                        ? 'border-[#32F3FF] bg-[#32F3FF]/5' 
                        : 'border-[#12344A] bg-[#04070C]/30'
                    } ${notif.read ? 'opacity-55' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle 
                          size={12} 
                          className={isEmergency ? 'text-[#FF4040] animate-pulse' : isWarning ? 'text-[#32F3FF]' : 'text-[#00FF9D]'} 
                        />
                        <span className={isEmergency ? 'text-[#FF4040]' : isWarning ? 'text-[#32F3FF]' : 'text-[#00FF9D]'}>
                          {notif.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-[#4f94c4] hover:text-[#00FF9D]"
                            title="MARK AS READ"
                          >
                            <Check size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notif.id)}
                          className="text-[#4f94c4] hover:text-[#FF4040]"
                          title="DELETE"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-[#EAF7FF] font-light leading-relaxed">
                      {notif.message}
                    </p>

                    <span className="text-[8px] text-[#4f94c4] text-right">
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
