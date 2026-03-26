import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If already signed in, skip marketing page.
    if (user) navigate("/feed", { replace: true });
  }, [user, navigate]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:p-10">
        <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl dark:bg-primary-400/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl dark:bg-emerald-400/10" />

        <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Greenbite
              <span className="text-slate-500 dark:text-slate-400">Food redistribution platform</span>
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-slate-50 md:text-4xl">
              Rescue surplus food. Deliver it faster. Reduce waste.
            </h1>
            <p className="max-w-prose text-sm text-slate-600 dark:text-slate-300">
              Greenbite connects donors with NGOs and local communities. Post available food with a photo and location.
              Claim only what you need. Use AI insights and maps to prioritize pickups before food spoils.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-500 dark:text-slate-950"
              >
                Get started
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/20 dark:text-slate-100 dark:hover:bg-slate-800/60"
              >
                Log in
              </Link>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Tip: ask the Assistant “describe this page”.
              </span>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">AI food verification</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Analyze uploaded images to estimate food type, freshness risk, and urgency.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Map + directions</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                View donation density on a heatmap, locate yourself, and open routes in Google Maps.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Partial claiming</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                NGOs and users can claim a specific quantity. Remaining food stays available and gets higher priority.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">How it works</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Simple flow for donors, NGOs, and community users.
            </p>
          </div>
          <Link
            to="/register"
            className="hidden rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-500 dark:text-slate-950 md:inline-flex"
          >
            Create account
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">1. Donors post food</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Upload a photo, add quantities and timestamps, and share your location.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">2. NGOs claim what they need</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Claim a specific amount, get directions, and coordinate pickup.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">3. AI helps prioritize</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Freshness risk and urgency help you pick what to rescue first.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Built for real-world pickup</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Location-based feed, heatmap visualization, claim tracking, and donor notifications.
              Designed so remaining food stays visible and urgent.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              "Live feed",
              "Heatmap",
              "Partial claims",
              "Pickup directions",
              "AI verification",
              "AI insights",
              "Assistant chatbot",
            ].map((t) => (
              <span
                key={t}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
