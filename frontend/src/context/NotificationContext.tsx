// src/context/NotificationContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import { toast } from "react-toastify";
import { AssetAlertToast } from "../notification/AssetAlertToast";

import {
  getAllNotifications,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type UserNotification,
} from "@/api/assetApi";

type NotificationType = UserNotification;

export interface TriggerAlertOptions {
  title?: string;
  asset: string;
  signal: string;
  status: "HIGH" | "LOW" | "NORMAL";
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  percent?: number;
  message?: string;
}

interface NotificationContextProps {
  notifications: NotificationType[];
  unreadCount: number;
  activeTab: "all" | "unread" | "read";
  setActiveTab: (tab: "all" | "unread" | "read") => void;

  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;

  markRead: (id: string) => void;
  markAllRead: () => void;
  triggerAlert: (options: TriggerAlertOptions) => void;
}

/* --------------------------------------------------------
   CONTEXT
-------------------------------------------------------- */
const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};

const NOTIFS_STORAGE_KEY = "paperpulp_notifications_store_v1";

const DEFAULT_SEEDED_NOTIFICATIONS: UserNotification[] = [
  {
    recipientId: "seed-pm1-break",
    notificationId: "seed-notif-pm1",
    title: "🚨 CRITICAL ALERT: PM-01-PAPER-MACHINE",
    text: JSON.stringify({
      asset: "PM-01-PAPER-MACHINE",
      assetId: "ast-mac-pm1",
      signal: "Press 3-to-Dryer Draw Diff",
      status: "HIGH",
      value: 2.85,
      min: 1.2,
      max: 2.2,
      unit: "%",
      percent: 24.8,
      timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
      message: "Sheet tension gradient exceeds safety ceiling. High open-draw web break hazard.",
    }),
    isRead: false,
    isAcknowledged: false,
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    readAt: null,
    acknowledgedAt: null,
  },
  {
    recipientId: "seed-boiler-press",
    notificationId: "seed-notif-boiler",
    title: "⚠️ PROCESS ALARM: RECOVERY-BOILER-01",
    text: JSON.stringify({
      asset: "RECOVERY-BOILER-01",
      assetId: "ast-mac-recb",
      signal: "Pre-Dryer Steam Header Pressure",
      status: "LOW",
      value: 82.0,
      min: 95.0,
      max: 105.0,
      unit: "bar",
      percent: -18.0,
      timestamp: new Date(Date.now() - 28 * 60000).toISOString(),
      message: "Header pressure sag below 95 bar causing insufficient drying curve.",
    }),
    isRead: false,
    isAcknowledged: false,
    createdAt: new Date(Date.now() - 28 * 60000).toISOString(),
    readAt: null,
    acknowledgedAt: null,
  },
  {
    recipientId: "seed-digester-temp",
    notificationId: "seed-notif-digester",
    title: "⚠️ PROCESS ALARM: CONTINUOUS-DIGESTER-01",
    text: JSON.stringify({
      asset: "CONTINUOUS-DIGESTER-01",
      assetId: "ast-mac-dig",
      signal: "Digester Cooking Zone Temperature",
      status: "HIGH",
      value: 174.5,
      min: 160.0,
      max: 170.0,
      unit: "°C",
      percent: 8.5,
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      message: "Over-cooking excursion threatens pulp kappa number uniformity.",
    }),
    isRead: true,
    isAcknowledged: true,
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    readAt: new Date(Date.now() - 40 * 60000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 40 * 60000).toISOString(),
  },
  {
    recipientId: "seed-headbox-cons",
    notificationId: "seed-notif-headbox",
    title: "⚠️ PROCESS ALARM: HEADBOX-SYSTEM",
    text: JSON.stringify({
      asset: "Paper Machine #1 Train (Step 15)",
      assetId: "ast-mac-pm1",
      signal: "Stock Consistency Sensor",
      status: "LOW",
      value: 0.68,
      min: 0.72,
      max: 0.85,
      unit: "%",
      percent: -12.4,
      timestamp: new Date(Date.now() - 75 * 60000).toISOString(),
      message: "Headbox thin stock consistency dropped below specification window.",
    }),
    isRead: false,
    isAcknowledged: false,
    createdAt: new Date(Date.now() - 75 * 60000).toISOString(),
    readAt: null,
    acknowledgedAt: null,
  },
];

const getStoredNotifications = (): UserNotification[] => {
  try {
    const raw = localStorage.getItem(NOTIFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_SEEDED_NOTIFICATIONS;
};

const saveStoredNotifications = (items: UserNotification[]) => {
  try {
    localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(items.slice(0, 80)));
  } catch {}
};

const filterListByTab = (list: NotificationType[], tab: "all" | "unread" | "read") => {
  if (tab === "unread") return list.filter(n => !n.isRead);
  if (tab === "read") return list.filter(n => n.isRead);
  return list;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rendered, setRendered] = useState<NotificationType[]>(() => {
    const initial = getStoredNotifications();
    return filterListByTab(initial, "all");
  });
  const [prefetch, setPrefetch] = useState<NotificationType[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [unreadCount, setUnreadCount] = useState(() => {
    const initial = getStoredNotifications();
    return initial.filter(n => !n.isRead).length;
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const [hasMore, setHasMore] = useState(false);

  const PAGE_SIZE = 10;

  /** --------------------------------------------------------
   * FETCH PAGE
  -------------------------------------------------------- */
  const fetchPage = async (cursorArg: string | null) => {
    if (activeTab === "all") {
      return getAllNotifications({ limit: PAGE_SIZE, cursor: cursorArg });
    }
    return getMyNotifications({ unread: activeTab === "unread", limit: PAGE_SIZE, cursor: cursorArg });
  };

  /** --------------------------------------------------------
   * INITIAL LOAD
  -------------------------------------------------------- */
  const loadInitial = async () => {
    setLoading(true);
    try {
      const first = await fetchPage(null);
      const apiData = first?.data ?? [];
      if (apiData.length > 0) {
        setRendered(apiData);
        const local = getStoredNotifications();
        const merged = [...apiData];
        for (const loc of local) {
          if (!merged.some(m => m.notificationId === loc.notificationId || m.recipientId === loc.recipientId)) {
            merged.push(loc);
          }
        }
        saveStoredNotifications(merged);
        setUnreadCount(merged.filter(n => !n.isRead).length);
      } else {
        const stored = getStoredNotifications();
        saveStoredNotifications(stored);
        setRendered(filterListByTab(stored, activeTab));
        setUnreadCount(stored.filter(n => !n.isRead).length);
      }

      if (first?.hasMore) {
        const second = await fetchPage(first.nextCursor);
        setPrefetch(second?.data ?? []);
        setNextCursor(second?.nextCursor ?? null);
        setHasMore(Boolean(second?.hasMore));
      } else {
        setHasMore(false);
        setPrefetch([]);
      }
    } catch {
      // Backend offline: restore seamlessly from localStorage
      const stored = getStoredNotifications();
      saveStoredNotifications(stored);
      setRendered(filterListByTab(stored, activeTab));
      setUnreadCount(stored.filter(n => !n.isRead).length);
      setHasMore(false);
      setPrefetch([]);
    } finally {
      setLoading(false);
    }
  };

  /** --------------------------------------------------------
   * LOAD MORE (PAGINATION)
  -------------------------------------------------------- */
  const loadMore = async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      setRendered(prev => [...prev, ...prefetch]);

      if (nextCursor) {
        const next = await fetchPage(nextCursor);
        setPrefetch(next.data);
        setNextCursor(next.nextCursor);
        setHasMore(next.hasMore);
      } else {
        setHasMore(false);
        setPrefetch([]);
      }
    } catch (err) {
      console.error("Failed to load more notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  /** --------------------------------------------------------
   * RELOAD WHEN TAB CHANGES
  -------------------------------------------------------- */
  useEffect(() => {
    const stored = getStoredNotifications();
    setRendered(filterListByTab(stored, activeTab));
    setUnreadCount(stored.filter(n => !n.isRead).length);
    setPrefetch([]);
    setNextCursor(null);
    loadInitial();
  }, [activeTab]);

  /** ===================================================
   * SIGNALR REAL-TIME NOTIFICATIONS
  =================================================== */
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    let connection: signalR.HubConnection | null = null;
    try {
      connection = new signalR.HubConnectionBuilder()
        .withUrl(`${apiUrl}/api/asset/hubs/notifications`, { withCredentials: true })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.None)
        .build();

      connection.start().catch(() => {
        // Silently handle when SignalR endpoint is offline
      });

      connection.on("ReceiveNotification", (notif: NotificationType) => {
        playNotificationSound();

        let parsed = null;
        try {
          parsed = typeof notif.text === "string" ? JSON.parse(notif.text) : notif.text;
        } catch (err) {
          console.error("JSON parse failed", err);
        }
        const data = parsed ? structuredClone(parsed) : null;

        toast(() => <AssetAlertToast data={data} />, {
          position: "top-right",
          autoClose: 7000,
          pauseOnHover: true,
          closeOnClick: true,
          draggable: true,
        });

        // Persist to localStorage
        const stored = getStoredNotifications();
        const updated = [notif, ...stored.filter(s => s.notificationId !== notif.notificationId && s.recipientId !== notif.recipientId)];
        saveStoredNotifications(updated);

        setUnreadCount(updated.filter(n => !n.isRead).length);

        if (activeTab !== "read") {
          setRendered(prev => [notif, ...prev]);
        }
      });
    } catch {
      // Hub initialization skipped if offline
    }

    return () => {
      connection?.stop();
    };
  }, [activeTab]);

  /** ===================================================
   * MARK SINGLE NOTIFICATION READ
  =================================================== */
  const markRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
    } catch {}

    const stored = getStoredNotifications();
    const updated = stored.map(n =>
      (n.notificationId === id || n.recipientId === id)
        ? { ...n, isRead: true, readAt: new Date().toISOString() }
        : n
    );
    saveStoredNotifications(updated);

    setRendered(prev =>
      activeTab === "unread"
        ? prev.filter(n => n.notificationId !== id && n.recipientId !== id)
        : prev.map(n =>
            (n.notificationId === id || n.recipientId === id)
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
    );
    setUnreadCount(updated.filter(n => !n.isRead).length);
  };

  /** ===================================================
   * MARK ALL NOTIFICATIONS READ
  =================================================== */
  const markAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
    } catch {}

    const stored = getStoredNotifications();
    const updated = stored.map(n => ({
      ...n,
      isRead: true,
      readAt: n.readAt || new Date().toISOString(),
    }));
    saveStoredNotifications(updated);

    setUnreadCount(0);
    if (activeTab === "unread") {
      setRendered([]);
    } else {
      setRendered(updated);
    }
  };

  /** --------------------------------------------------------
   * PLAY SOUND
  -------------------------------------------------------- */
  function playNotificationSound() {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();

      function playTone(frequency: number, duration: number, startTime: number) {
        const oscillator = audioCtx.createOscillator();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, startTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.18, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      }

      const now = audioCtx.currentTime;
      playTone(950, 0.15, now);
      playTone(1250, 0.18, now + 0.16);
    } catch (e) {
      console.warn("AudioContext tone warning:", e);
    }
  }

  /** ===================================================
   * TRIGGER ALERT (DISPATCH REAL-TIME ALERT)
  =================================================== */
  const triggerAlert = (options: TriggerAlertOptions) => {
    // 1. Audible Alarm
    playNotificationSound();

    // 2. Structured Payload for AssetAlertToast and NotificationList
    const alertData = {
      asset: options.asset,
      signal: options.signal,
      status: options.status,
      value: options.value,
      min: options.min ?? 0,
      max: options.max ?? 100,
      unit: options.unit ?? "",
      percent: options.percent ?? 0,
      timestamp: new Date().toISOString(),
      message: options.message,
    };

    // 3. Visual Toast Notification
    if (options.status === "NORMAL") {
      toast.success(options.message || `System normalized: ${options.asset}`, {
        position: "top-right",
        autoClose: 5000,
      });
    } else {
      toast(() => <AssetAlertToast data={alertData} />, {
        position: "top-right",
        autoClose: 8000,
        pauseOnHover: true,
        closeOnClick: true,
        draggable: true,
      });
    }

    // 4. Save into in-memory and persistent localStorage store
    const newNotif: UserNotification = {
      recipientId: "sim-" + Date.now(),
      notificationId: "notif-" + Date.now(),
      title: options.title || `${options.status === "HIGH" ? "🚨 CRITICAL ALERT" : options.status === "LOW" ? "⚠️ PROCESS ALARM" : "✅ NORMAL"}: ${options.asset}`,
      text: JSON.stringify(alertData),
      isRead: false,
      isAcknowledged: false,
      createdAt: new Date().toISOString(),
      readAt: null,
      acknowledgedAt: null,
    };

    const stored = getStoredNotifications();
    const updated = [newNotif, ...stored.filter(s => s.notificationId !== newNotif.notificationId && s.recipientId !== newNotif.recipientId)];
    saveStoredNotifications(updated);

    if (activeTab !== "read") {
      setRendered(prev => [newNotif, ...prev]);
    }
    if (options.status !== "NORMAL") {
      setUnreadCount(prev => prev + 1);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications: rendered,
        unreadCount,
        activeTab,
        setActiveTab,
        loadMore,
        hasMore,
        loading,
        markRead,
        markAllRead,
        triggerAlert,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
