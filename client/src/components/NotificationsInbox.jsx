import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications.js";

const BellIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M15 17H9m11-5a7 7 0 1 0-14 0c0 7-3 7-3 7h20s-3 0-3-7Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.73 21a2.3 2.3 0 0 0 4.54 0"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const NotificationsInbox = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, error, reload, markAllRead } = useNotifications({
    autoLoad: true,
  });

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all"); // "all" | "unread"
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // Lightweight polling so the badge stays fresh across pages.
  useEffect(() => {
    const t = setInterval(() => {
      reload().catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, [reload]);

  const list = useMemo(() => {
    const base = Array.isArray(notifications) ? notifications : [];
    const filtered = tab === "unread" ? base.filter((n) => !n?.read) : base;
    return filtered.slice(0, 30);
  }, [notifications, tab]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label="Notifications"
        title="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">
            {Math.min(99, unreadCount)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[9999] mt-2 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Inbox</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {unreadCount} unread
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reload}
                className="rounded-lg bg-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
              >
                Mark read
              </button>
            </div>
          </div>

          <div className="flex gap-2 px-4 py-2">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${
                tab === "all"
                  ? "bg-primary-600 text-white ring-primary-600 dark:text-slate-950"
                  : "bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTab("unread")}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${
                tab === "unread"
                  ? "bg-primary-600 text-white ring-primary-600 dark:text-slate-950"
                  : "bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
              }`}
            >
              Unread
            </button>
          </div>

          {error && (
            <div className="px-4 pb-2 text-[11px] text-rose-600 dark:text-rose-300">{error}</div>
          )}

          <div className="max-h-[360px] overflow-auto px-2 pb-2">
            {loading && list.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Loading…
              </div>
            ) : list.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No notifications.
              </div>
            ) : (
              <ul className="space-y-1">
                {list.map((n) => {
                  const donationId =
                    n?.donationId && typeof n.donationId === "object" ? n.donationId._id : n?.donationId;
                  const clickable = !!donationId;
                  const type = String(n?.type || "").toLowerCase();
                  const isExpired = type === "donation_expired";
                  return (
                    <li key={n._id}>
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => {
                          if (!donationId) return;
                          setOpen(false);
                          navigate(`/feed?donationId=${encodeURIComponent(donationId)}`);
                        }}
                        className={`flex w-full min-w-0 items-start gap-2 rounded-xl px-3 py-2 text-left text-xs leading-snug transition ${
                          clickable
                            ? "hover:bg-slate-100 dark:hover:bg-slate-800"
                            : "opacity-80"
                        }`}
                        title={clickable ? "Open donation details" : ""}
                      >
                        <span
                          className={`mt-1 inline-flex h-2 w-2 shrink-0 rounded-full ${
                            isExpired
                              ? n?.read
                                ? "bg-rose-300 dark:bg-rose-900/60"
                                : "bg-rose-600"
                              : n?.read
                              ? "bg-slate-300 dark:bg-slate-700"
                              : "bg-primary-600"
                          }`}
                        />
                        <span
                          className={`min-w-0 flex-1 whitespace-normal break-words ${
                            n?.read ? "text-slate-600 dark:text-slate-300" : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {n?.message || "Notification"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
