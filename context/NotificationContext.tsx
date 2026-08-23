"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { createClient } from "@/lib/supabase/client";

export interface Notification {
  id: string;
  type: "sale" | "stock" | "product" | "login" | "logout";
  title: string;
  message: string;
  time: string;
  read: boolean;
  user?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markAsRead: (id: string) => void;
  addNotification: (notification: Omit<Notification, "id" | "time" | "read">) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const supabaseRef = useRef(createClient());
  const dbChannelRef = useRef<any>(null);
  const initializedRef = useRef(false);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("boutiqueos-notifications");
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("boutiqueos-notifications", JSON.stringify(notifications));
  }, [notifications]);

  const addNotificationLocal = useCallback(
    (notification: Omit<Notification, "id" | "time" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        time: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
    },
    []
  );

  // Listen for database changes (new products added)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const supabase = supabaseRef.current;

    const dbChannel = supabase
      .channel("product-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "product_variants" },
        (payload: any) => {
          addNotificationLocal({
            type: "product",
            title: "New Product Added",
            message: `${payload.new?.barcode || "Unknown"} was added to inventory`,
          });
        }
      )
      .subscribe();

    dbChannelRef.current = dbChannel;

    return () => {
      if (dbChannelRef.current) {
        supabase.removeChannel(dbChannelRef.current);
        dbChannelRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [addNotificationLocal]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "time" | "read">) => {
      addNotificationLocal(notification);
    },
    [addNotificationLocal]
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllRead,
        markAsRead,
        addNotification,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}