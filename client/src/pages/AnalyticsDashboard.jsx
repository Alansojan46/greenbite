import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../services/api.js";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#14b8a6"];

const toDateLabel = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v || "");
  return d.toLocaleDateString();
};

const categorize = (foodName) => {
  const s = String(foodName || "").toLowerCase();
  if (s.includes("biryani") || s.includes("rice") || s.includes("pulao")) return "Rice";
  if (s.includes("dosa") || s.includes("idli") || s.includes("uttapam")) return "Tiffin";
  if (s.includes("curry") || s.includes("dal") || s.includes("masala") || s.includes("paneer")) return "Curry";
  if (s.includes("roti") || s.includes("naan") || s.includes("bread") || s.includes("paratha")) return "Bread";
  if (s.includes("snack") || s.includes("samosa") || s.includes("pakora") || s.includes("fries")) return "Snacks";
  return "Other";
};

export const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trends, setTrends] = useState([]);
  const [riskBuckets, setRiskBuckets] = useState([]);
  const [highRiskPct, setHighRiskPct] = useState(0);
  const [forecast, setForecast] = useState(null);
  const [ngoRows, setNgoRows] = useState([]);
  const [categoryRows, setCategoryRows] = useState([]);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [t, r, f, n, donations] = await Promise.all([
        api.get("/analytics/donation-trends?interval=day"),
        api.get("/analytics/expiry-risk"),
        api.get("/analytics/donation-forecast?windowDays=7"),
        api.get("/analytics/ngo-performance"),
        api.get("/donations"),
      ]);

      const trendPoints = Array.isArray(t.data?.points) ? t.data.points : [];
      setTrends(
        trendPoints.map((p) => ({
          period: p.period,
          label: toDateLabel(p.period),
          count: Number(p.count) || 0,
        }))
      );

      const buckets = Array.isArray(r.data?.buckets) ? r.data.buckets : [];
      setRiskBuckets(
        buckets.map((b) => ({
          name: b.bucket,
          value: Number(b.count) || 0,
        }))
      );
      setHighRiskPct(Number(r.data?.highRiskPercentage) || 0);

      setForecast({
        predictedNextDayCount: Number(f.data?.predictedNextDayCount) || 0,
        windowDays: Number(f.data?.windowDays) || 7,
      });

      const ngos = Array.isArray(n.data?.ngos) ? n.data.ngos : [];
      setNgoRows(ngos);

      const donationList = Array.isArray(donations.data) ? donations.data : [];
      const counts = new Map();
      for (const d of donationList) {
        const key = categorize(d?.foodName);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      setCategoryRows(
        [...counts.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      );
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load analytics.";
      setError(message);
      setTrends([]);
      setRiskBuckets([]);
      setHighRiskPct(0);
      setForecast(null);
      setNgoRows([]);
      setCategoryRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const riskPieData = useMemo(() => {
    const order = ["low", "medium", "high"];
    const byName = new Map(riskBuckets.map((b) => [String(b.name || "").toLowerCase(), b]));
    return order
      .map((k) => byName.get(k))
      .filter(Boolean)
      .map((b) => ({ name: b.name, value: b.value }));
  }, [riskBuckets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Analytics
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Donation trends, expiry risk, forecasting, and NGO performance.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/40"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70 lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Donation trends (daily)
            </h2>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Forecast
            </h2>
            <div className="mt-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Next day (moving avg, {forecast?.windowDays || 7} days)
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">
                {forecast?.predictedNextDayCount ?? 0}
              </p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                High-risk donations:{" "}
                <span className="font-semibold text-rose-600 dark:text-rose-300">
                  {highRiskPct.toFixed(2)}%
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Category distribution
            </h2>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryRows}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Urgency breakdown
            </h2>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={riskPieData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {riskPieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Based on donation spoilage risk buckets (low/medium/high).
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70 lg:col-span-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              NGO performance
            </h2>
            <div className="mt-3 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[780px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2 font-semibold">NGO</th>
                    <th className="px-3 py-2 font-semibold">Total claims</th>
                    <th className="px-3 py-2 font-semibold">Unique donations</th>
                    <th className="px-3 py-2 font-semibold">Avg response (min)</th>
                    <th className="px-3 py-2 font-semibold">Completion rate</th>
                  </tr>
                </thead>
                <tbody>
                  {ngoRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={5}>
                        No NGO claim data yet.
                      </td>
                    </tr>
                  ) : (
                    ngoRows.map((r) => (
                      <tr key={String(r.ngoId)} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                          {r.ngoName}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r.totalClaims}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r.uniqueDonationsClaimed}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r.avgClaimResponseMinutes}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r.completionRate}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

