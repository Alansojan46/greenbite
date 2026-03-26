import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { ChatbotWidget } from "./ChatbotWidget.jsx";
import { NotificationsInbox } from "./NotificationsInbox.jsx";

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const ThemeIcon = ({ mode }) => {
    const isDark = mode === "dark";
    return isDark ? (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M21 14.2A8.5 8.5 0 0 1 9.8 3a6.9 6.9 0 1 0 11.2 11.2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="relative z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="rounded bg-primary-600 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white dark:bg-primary-600 dark:text-slate-950">
              Greenbite
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Rescue · Redistribute · Reuse
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {user ? (
              <>
                <Link
                  to="/feed"
                  className="text-slate-600 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400"
                >
                  Feed
                </Link>
                <Link
                  to="/heatmap"
                  className="text-slate-600 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400"
                >
                  Heatmap
                </Link>
                <Link
                  to="/ai-insights"
                  className="text-slate-600 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400"
                >
                  AI Insights
                </Link>
                <Link
                  to="/dashboard/analytics"
                  className="text-slate-600 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400"
                >
                  Analytics
                </Link>
              </>
            ) : (
              <Link
                to="/"
                className="text-slate-600 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400"
              >
                About
              </Link>
            )}
            {user && <NotificationsInbox />}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              aria-label="Toggle theme"
            >
              <ThemeIcon mode={theme} />
            </button>
            {user ? (
              <>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {user.name} · {user.role}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white hover:bg-primary-500 dark:text-slate-950"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <ChatbotWidget />
    </div>
  );
};
