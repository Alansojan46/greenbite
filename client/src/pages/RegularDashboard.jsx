import React from "react";
import { Link } from "react-router-dom";
import { NotificationsPanel } from "../components/NotificationsPanel.jsx";

export const RegularDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Community Dashboard</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Choose how you’d like to help: donate surplus food or claim donations for yourself or others.
        </p>
      </div>
      <NotificationsPanel title="Food updates" limit={5} />
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/donate"
          className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-primary-500"
        >
          <span className="text-3xl">🍽️</span>
          <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            I want to donate
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Post surplus food with a photo and location. NGOs and others can claim it.
          </p>
          <span className="mt-3 text-sm font-medium text-primary-600 dark:text-primary-400">
            Post a donation →
          </span>
        </Link>
        <Link
          to="/claim-flow"
          className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-primary-500"
        >
          <span className="text-3xl">📦</span>
          <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            I want to claim
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Tell us what you need. We’ll suggest nearby donations and show pickup location on the map.
          </p>
          <span className="mt-3 text-sm font-medium text-primary-600 dark:text-primary-400">
            Find donations →
          </span>
        </Link>
      </div>
    </div>
  );
};
