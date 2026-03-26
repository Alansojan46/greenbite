import React from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications.js";

export const NotificationsPanel = ({ title = "Notifications", limit = 5 }) => {
  const { notifications, unreadCount, loading, error, reload, markAllRead } =
    useNotifications();
  const navigate = useNavigate();

  const list = Array.isArray(notifications) ? notifications.slice(0, limit) : [];

  if (loading && list.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
        Loading notifications…
      </div>
    );
  }

  if (error && list.length === 0) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
        <div className="flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={reload}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!list.length) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {title}
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
              {unreadCount}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reload}
            className="rounded-lg bg-amber-200 px-3 py-1.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-300 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900/70"
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

      <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300">
        {list.map((n) => {
          const donationId =
            n?.donationId && typeof n.donationId === "object"
              ? n.donationId._id
              : n?.donationId;
          const clickable = !!donationId;
          const type = String(n?.type || "").toLowerCase();
          const isExpired = type === "donation_expired";
          return (
            <li key={n._id} className={n.read ? "opacity-80" : ""}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => {
                  if (!donationId) return;
                  navigate(`/feed?donationId=${encodeURIComponent(donationId)}`);
                }}
                className={`text-left ${
                  clickable
                    ? "hover:underline cursor-pointer"
                    : "cursor-default"
                }`}
                title={clickable ? "Open donation details" : ""}
              >
                <span className="inline-flex items-start gap-2">
                  {isExpired && (
                    <span
                      className={`mt-1 inline-flex h-2 w-2 rounded-full ${
                        n?.read ? "bg-rose-300 dark:bg-rose-900/60" : "bg-rose-600"
                      }`}
                      aria-label="Expired"
                      title="Expired"
                    />
                  )}
                  <span className="whitespace-normal break-words">{n.message}</span>
                </span>
                {n.claimerId?.name && (
                  <span className="ml-1">(Claimed by {n.claimerId.name})</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
