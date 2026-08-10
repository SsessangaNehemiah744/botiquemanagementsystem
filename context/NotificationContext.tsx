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

interface OnlineUser {
  id: string;
  name: string;
  email: string;
  role: string;
  lastSeen: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  onlineUsers: OnlineUser[];
  onlineCount: number;
  markAllRead: () => void;
  markAsRead: (id: string) => void;
  addNotification: (notification: Omit<Notification, "id" | "time" | "read">) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  // Fetch initial notifications from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("boutiqueos-notifications");
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("boutiqueos-notifications", JSON.stringify(notifications));
  }, [notifications]);

  // Track current user's presence
  useEffect(() => {
    async function setupPresence() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

      const userData = {
        id: user.id,
        name: profile?.full_name || user.email?.split("@")[0] || "Unknown",
        email: user.email || "",
        role: profile?.role || "cashier",
        lastSeen: new Date().toISOString(),
      };

      const channel = supabase.channel("online-users", {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const users: OnlineUser[] = [];
          Object.values(state).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              if (!users.find((u) => u.id === presence.id)) {
                users.push(presence);
              }
            });
          });
          setOnlineUsers(users);
        })
        .on("presence", { event: "join" }, ({ newPresences }: any) => {
          const newUser = newPresences[0];
          if (newUser && newUser.id !== user.id) {
            addNotificationLocal({
              type: "login",
              title: "User Online",
              message: `${newUser.name} is now online`,
              user: newUser.name,
            });
          }
        })
        .on("presence", { event: "leave" }, ({ leftPresences }: any) => {
          const leftUser = leftPresences[0];
          if (leftUser) {
            addNotificationLocal({
              type: "logout",
              title: "User Offline",
              message: `${leftUser.name} went offline`,
              user: leftUser.name,
            });
          }
        })
        .subscribe(async (status: string) => {
          if (status === "SUBSCRIBED") {
            await channel.track(userData);
          }
        });

      channelRef.current = channel;
    }

    setupPresence();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Listen for database changes (new products)
  useEffect(() => {
    const productChannel = supabase
      .channel("product-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "product_variants" },
        (payload: any) => {
          addNotificationLocal({
            type: "product",
            title: "New Product Added",
            message: `${payload.new?.sku || "Unknown"} was added to inventory`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productChannel);
    };
  }, []);

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
        onlineUsers,
        onlineCount: onlineUsers.length,
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