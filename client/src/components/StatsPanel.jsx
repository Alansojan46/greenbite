import React from "react";

export const StatsPanel = ({ stats }) => {
  const items = [
    {
      label: "Total Donations",
      value: stats.totalDonations ?? 0,
      accent: "text-emerald-600 dark:text-emerald-300"
    },
    {
      label: "Claimed",
      value: stats.claimedDonations ?? 0,
      accent: "text-amber-600 dark:text-amber-300"
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900/70">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center justify-center gap-1 py-1 text-center">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
          <p className={`text-4xl font-extrabold leading-none ${item.accent}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
};
