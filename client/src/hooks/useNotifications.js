import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";

export const useNotifications = ({ autoLoad = true } = {}) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n?.read).length,
    [notifications]
  );

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/notifications");
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load notifications.";
      setError(message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.patch("/notifications/read");
      // Keep items visible; just mark them read locally.
      setNotifications((prev) =>
        (Array.isArray(prev) ? prev : []).map((n) => (n ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (autoLoad) reload();
  }, [autoLoad, reload]);

  return { notifications, unreadCount, loading, error, reload, markAllRead };
};
