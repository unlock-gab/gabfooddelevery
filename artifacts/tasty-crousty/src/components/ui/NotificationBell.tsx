import React, { useState, useEffect, useRef } from "react";
import { Bell, BellDot, CheckCheck, Package, Truck, MapPin, CheckCircle, XCircle, AlertCircle, ChefHat } from "lucide-react";
import { Link } from "wouter";

interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedOrderId: number | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  order_placed: <Package className="w-4 h-4 text-blue-500" />,
  driver_assigned: <Truck className="w-4 h-4 text-blue-500" />,
  mission_request: <Truck className="w-4 h-4 text-amber-500" />,
  confirmation_complete: <CheckCircle className="w-4 h-4 text-green-500" />,
  correction_needed: <AlertCircle className="w-4 h-4 text-orange-500" />,
  preparation_started: <ChefHat className="w-4 h-4 text-purple-500" />,
  ready_for_pickup: <Package className="w-4 h-4 text-indigo-500" />,
  picked_up: <Truck className="w-4 h-4 text-cyan-500" />,
  on_the_way: <Truck className="w-4 h-4 text-cyan-600" />,
  arriving_soon: <MapPin className="w-4 h-4 text-teal-500" />,
  delivered: <CheckCircle className="w-4 h-4 text-green-600" />,
  cancelled: <XCircle className="w-4 h-4 text-red-500" />,
  failed: <XCircle className="w-4 h-4 text-red-600" />,
  general: <Bell className="w-4 h-4 text-slate-400" />,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return `il y a ${Math.floor(hrs / 24)}j`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    const token = localStorage.getItem("tc_token");
    if (!token) return;
    try {
      const res = await fetch("/api/notifications?limit=20", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {}
  }

  async function markAllRead() {
    const token = localStorage.getItem("tc_token");
    if (!token) return;
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  }

  async function markRead(id: number) {
    const token = localStorage.getItem("tc_token");
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) fetchNotifications();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellDot className="w-5 h-5 text-primary" />
        ) : (
          <Bell className="w-5 h-5 text-slate-500" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-500">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                <CheckCheck className="w-3 h-3" /> Tout lire
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Aucune notification</p>
              </div>
            )}
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.isRead) markRead(n.id); }}
                className={`flex gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.isRead ? "bg-blue-50/40" : ""}`}
              >
                <div className="mt-0.5 shrink-0">
                  {TYPE_ICONS[n.type] ?? TYPE_ICONS.general}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-semibold truncate ${!n.isRead ? "text-slate-900" : "text-slate-600"}`}>
                      {n.title}
                    </p>
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                    {n.relatedOrderId && (
                      <Link
                        href={`/orders/${n.relatedOrderId}`}
                        className="text-[10px] text-primary hover:underline"
                        onClick={() => setOpen(false)}
                      >
                        Voir commande →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <Link href="/orders" className="text-xs text-primary hover:underline font-medium block text-center" onClick={() => setOpen(false)}>
              Voir toutes mes commandes
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
