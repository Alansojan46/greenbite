import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { StatsPanel } from "../components/StatsPanel.jsx";
import { FoodAIAnalyzer } from "../components/FoodAIAnalyzer.jsx";
import { DonationDetailsModal } from "../components/DonationDetailsModal.jsx";
import { NotificationsPanel } from "../components/NotificationsPanel.jsx";
import { MapView } from "../components/MapView.jsx";
import { requestBrowserLocation } from "../utils/geolocation.js";

export const DonorDashboard = () => {
  const { user } = useAuth();
  const googleMapsKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.GOOGLE_MAPS_API_KEY || "";
  const googleMapsEnabled =
    String(import.meta.env.VITE_ENABLE_GOOGLE_MAPS || "").toLowerCase() === "true" && !!googleMapsKey;
  const [donations, setDonations] = useState([]);
  const [donationsError, setDonationsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [foodAnalysisId, setFoodAnalysisId] = useState("");
  const [detailsDonation, setDetailsDonation] = useState(null);
  const [form, setForm] = useState({
    foodName: "",
    quantityKg: "",
    quantityUnits: "",
    preparedAt: "",
    expiryEstimate: ""
  });
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationMode, setLocationMode] = useState(""); // "" | "current" | "map"
  const [publishLocation, setPublishLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

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

  const captureLocation = async () => requestBrowserLocation();

  const syncManualFromLocation = (loc) => {
    if (!loc) {
      setManualLat("");
      setManualLng("");
      return;
    }
    setManualLat(String(Number(loc.lat).toFixed(6)));
    setManualLng(String(Number(loc.lng).toFixed(6)));
  };

  const updateManualLocation = (nextLat, nextLng) => {
    setManualLat(nextLat);
    setManualLng(nextLng);
    const lat = Number(nextLat);
    const lng = Number(nextLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const loc = { lat, lng };
      setPublishLocation(loc);
      setMapCenter(loc);
    } else {
      setPublishLocation(null);
    }
  };

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
      if (!locationMode) {
        setLocationError("Please choose how you want to set the donation location (current location or pick on map).");
        setSubmitting(false);
        return;
      }
      const location = publishLocation;
      if (!location) {
        setLocationError(
          locationMode === "map"
            ? "Please pick a location on the map to publish this donation."
            : "Please allow location access to use your current location."
        );
        setSubmitting(false);
        return;
      }
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => value && data.append(key, value));
      if (foodAnalysisId) data.append("foodAnalysisId", foodAnalysisId);
      data.append("location.lat", location.lat);
      data.append("location.lng", location.lng);
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
        preparedAt: "",
        expiryEstimate: ""
      });
      setImageFile(null);
      setFoodAnalysisId("");
      setLocationMode("");
      setPublishLocation(null);
      setMapCenter(null);
      syncManualFromLocation(null);
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
    const claimed = donations.filter((d) => {
      const s = String(d?.status || "").toLowerCase();
      if (s === "claimed" || s === "completed") return true;
      if (Array.isArray(d?.claims) && d.claims.length > 0) return true;
      return false;
    }).length;
    return {
      totalDonations: total,
      claimedDonations: claimed,
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

      <div className="grid items-start gap-6 md:grid-cols-2">
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

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/30">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Donation location
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={async () => {
                  setLocationError("");
                  setLocationMode("current");
                  const loc = await captureLocation();
                  if (!loc) {
                    setPublishLocation(null);
                    syncManualFromLocation(null);
                    setLocationError("Location access was denied. You can pick a location on the map instead.");
                    return;
                  }
                  setPublishLocation(loc);
                  setMapCenter(loc);
                  syncManualFromLocation(loc);
                }}
                className={`rounded-full px-3 py-1.5 font-semibold ring-1 ${
                  locationMode === "current"
                    ? "bg-primary-600 text-white ring-primary-600 dark:text-slate-950"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800"
                }`}
              >
                Use current location
              </button>
              <button
                type="button"
                onClick={async () => {
                  setLocationError("");
                  setLocationMode("map");
                  setPublishLocation(null);
                  syncManualFromLocation(null);
                  if (!mapCenter) {
                    const loc = await captureLocation();
                    if (loc) setMapCenter(loc);
                  }
                }}
                className={`rounded-full px-3 py-1.5 font-semibold ring-1 ${
                  locationMode === "map"
                    ? "bg-primary-600 text-white ring-primary-600 dark:text-slate-950"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800"
                }`}
              >
                Pick on map
              </button>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              Selected:{" "}
              <span className="font-semibold">
                {publishLocation
                  ? `${publishLocation.lat.toFixed(5)}, ${publishLocation.lng.toFixed(5)}`
                  : "Not selected"}
              </span>
            </div>

            {locationMode === "map" && (
              <div className="space-y-2">
                {!googleMapsEnabled && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                    Map click-to-pick requires Google Maps to be enabled. You can still set the location by entering
                    latitude/longitude below.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200" htmlFor="manualLatDonor">
                      Latitude
                    </label>
                    <input
                      id="manualLatDonor"
                      value={manualLat}
                      onChange={(e) => updateManualLocation(e.target.value, manualLng)}
                      placeholder="e.g., 12.9716"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200" htmlFor="manualLngDonor">
                      Longitude
                    </label>
                    <input
                      id="manualLngDonor"
                      value={manualLng}
                      onChange={(e) => updateManualLocation(manualLat, e.target.value)}
                      placeholder="e.g., 77.5946"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <MapView
                  center={publishLocation || mapCenter || undefined}
                  zoom={mapCenter ? 15 : 12}
                  height="240px"
                  pickable
                  pickedLocation={publishLocation}
                  onPickLocation={(loc) => {
                    setPublishLocation(loc);
                    setMapCenter(loc);
                    syncManualFromLocation(loc);
                  }}
                  pickedLabel="Donation"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setPublishLocation(null);
                      syncManualFromLocation(null);
                    }}
                    className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            )}
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
                foodName: r?.foodType ? r.foodType : p.foodName,
              }));
            }}
          />
          {locationError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{locationError}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !locationMode || !publishLocation}
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
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                      String(d.status || "").toLowerCase() === "available"
                        ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/40 dark:text-emerald-300"
                        : String(d.status || "").toLowerCase() === "claimed"
                        ? "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/40 dark:text-amber-300"
                        : String(d.status || "").toLowerCase() === "expired"
                        ? "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/40 dark:text-rose-200"
                        : "bg-slate-200 text-slate-600 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700/60"
                    }`}
                  >
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
                      {d.remainingKg ?? d.quantityKg ?? d.remainingUnits ?? d.quantityUnits ?? "-"}
                    </span>{" "}
                    {d.remainingKg != null || d.quantityKg != null ? "kg" : d.remainingUnits != null || d.quantityUnits != null ? "units" : ""}
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
