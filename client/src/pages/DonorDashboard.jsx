import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { StatsPanel } from "../components/StatsPanel.jsx";
import { FoodAIAnalyzer } from "../components/FoodAIAnalyzer.jsx";
import { DonationDetailsModal } from "../components/DonationDetailsModal.jsx";
import { NotificationsPanel } from "../components/NotificationsPanel.jsx";

export const DonorDashboard = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [donationsError, setDonationsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [foodAnalysisId, setFoodAnalysisId] = useState("");
  const [detailsDonation, setDetailsDonation] = useState(null);
  const [form, setForm] = useState({
    foodName: "",
    quantityKg: "",
    quantityUnits: "",
    estimatedPeopleServed: "",
    preparedAt: "",
    expiryEstimate: ""
  });
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationError, setLocationError] = useState("");

  const loadDonations = async () => {
    setDonationsError("");
    try {
      const res = await api.get("/donations?donor=me");
      setDonations(res.data);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load your donations.";
      setDonationsError(message);
    }
  };

  useEffect(() => {
    loadDonations();
  }, []);

  const captureLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }),
        () => resolve(null)
      );
    });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocationError("");
    setSubmitError("");
    if (!imageFile) {
      return; // browser will show required on file input
    }
    setSubmitting(true);
    try {
      const location = await captureLocation();
      if (!location) {
        setLocationError("Location is required. Please allow location access and try again.");
        setSubmitting(false);
        return;
      }
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => value && data.append(key, value));
      if (foodAnalysisId) data.append("foodAnalysisId", foodAnalysisId);
      if (location) {
        data.append("location.lat", location.lat);
        data.append("location.lng", location.lng);
      }
      if (imageFile) {
        data.append("foodImage", imageFile);
      }
      const created = await api.post("/donations", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (created?.data?._id) {
        setDonations((prev) => {
          if (prev.some((d) => d?._id === created.data._id)) return prev;
          return [created.data, ...prev];
        });
        setDetailsDonation(created.data);
      }
      setForm({
        foodName: "",
        quantityKg: "",
        quantityUnits: "",
        estimatedPeopleServed: "",
        preparedAt: "",
        expiryEstimate: ""
      });
      setImageFile(null);
      setFoodAnalysisId("");
      // Ensure server-side computed fields + ordering are reflected.
      await loadDonations();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.errors)
          ? err.response.data.errors.map((e) => e?.msg).filter(Boolean).join(", ")
          : "") ||
        err?.message ||
        "Failed to publish donation.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const total = donations.length;
    const claimed = donations.filter((d) => d.status === "claimed").length;
    const avgImpact =
      donations.reduce((sum, d) => sum + (d.impactScore || 0), 0) / (total || 1);
    return {
      totalDonations: total,
      claimedDonations: claimed,
      avgImpactScore: Math.round(avgImpact)
    };
  }, [donations]);

  const recentDonation = donations?.[0] || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Donor Dashboard</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create live food donations and track their impact in real time.
          </p>
        </div>
      </div>

      <StatsPanel stats={stats} />

      {donationsError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          <div className="flex items-center justify-between gap-3">
            <span>{donationsError}</span>
            <button
              type="button"
              onClick={loadDonations}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <NotificationsPanel title="Notifications" limit={5} />

      <div className="grid gap-6 md:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70"
        >
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Add donation</h2>

          {submitError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
              {submitError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300" htmlFor="foodName">
              Food name
            </label>
            <input
              id="foodName"
              name="foodName"
              required
              value={form.foodName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-300" htmlFor="quantityKg">
                Quantity (kg)
              </label>
              <input
                id="quantityKg"
                name="quantityKg"
                type="number"
                value={form.quantityKg}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-300" htmlFor="quantityUnits">
                Units
              </label>
              <input
                id="quantityUnits"
                name="quantityUnits"
                type="number"
                value={form.quantityUnits}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              className="text-xs text-slate-600 dark:text-slate-300"
              htmlFor="estimatedPeopleServed"
            >
              Estimated people served
            </label>
            <input
              id="estimatedPeopleServed"
              name="estimatedPeopleServed"
              type="number"
              value={form.estimatedPeopleServed}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-300" htmlFor="preparedAt">
                Prepared at
              </label>
              <input
                id="preparedAt"
                name="preparedAt"
                type="datetime-local"
                required
                value={form.preparedAt}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-300" htmlFor="expiryEstimate">
                Expires around
              </label>
              <input
                id="expiryEstimate"
                name="expiryEstimate"
                type="datetime-local"
                value={form.expiryEstimate}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300" htmlFor="image">
              Food photo <span className="text-rose-500">*</span>
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              required
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-slate-600 dark:text-slate-300"
            />
          </div>

          <FoodAIAnalyzer
            file={imageFile}
            preparedAt={form.preparedAt}
            showInputs={false}
            showPreparedAt={false}
            onAnalyzed={(r) => setFoodAnalysisId(r?.analysisId || "")}
            onApply={(r) => {
              if (r?.analysisId) setFoodAnalysisId(r.analysisId);
              setForm((p) => ({
                ...p,
                foodName: p.foodName || r?.foodType || "",
                estimatedPeopleServed:
                  p.estimatedPeopleServed || String(r?.estimatedServings || ""),
              }));
            }}
          />
          {locationError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{locationError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full rounded-lg bg-primary-600 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-500 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            {submitting ? "Publishing..." : "Publish donation"}
          </button>
        </form>

        <div className="space-y-3">
          {recentDonation && (
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Most recent donation
                </p>
                <button
                  type="button"
                  onClick={() => setDetailsDonation(recentDonation)}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-800/60"
                >
                  View details
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                {recentDonation.foodImage ? (
                  <img
                    src={recentDonation.foodImage}
                    alt="Recent donation"
                    className="h-10 w-10 rounded-lg border border-slate-200 object-cover dark:border-slate-800"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {recentDonation.foodName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Posted{" "}
                    {recentDonation.createdAt
                      ? new Date(recentDonation.createdAt).toLocaleString()
                      : "-"}
                    {" - "}Status: {recentDonation.status || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Your live and claimed donations
          </h2>
          <div className="grid gap-3">
            {donations.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No donations yet. Use the form to publish your surplus food.
              </p>
            )}
            {donations.map((d) => (
              <div
                key={d._id}
                className="rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{d.foodName}</p>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {d.status}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Impact score:{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                    {d.impactScore}
                  </span>{" "}
                  · Spoilage risk:{" "}
                  <span className="font-semibold text-amber-600 dark:text-amber-300">
                    {d.spoilageRisk}%
                  </span>
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setDetailsDonation(d)}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-800/60"
                  >
                    View details
                  </button>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Remaining:{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {d.remainingPeopleServed ?? d.estimatedPeopleServed ?? "-"}
                    </span>{" "}
                    servings
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DonationDetailsModal
        donation={detailsDonation}
        onClose={() => setDetailsDonation(null)}
      />
    </div>
  );
};
