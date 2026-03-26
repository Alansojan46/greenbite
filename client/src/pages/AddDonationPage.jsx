import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { FoodAIAnalyzer } from "../components/FoodAIAnalyzer.jsx";
import { MapView } from "../components/MapView.jsx";
import { requestBrowserLocation } from "../utils/geolocation.js";

export const AddDonationPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const googleMapsKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.GOOGLE_MAPS_API_KEY || "";
  const googleMapsEnabled =
    String(import.meta.env.VITE_ENABLE_GOOGLE_MAPS || "").toLowerCase() === "true" && !!googleMapsKey;
  const [form, setForm] = useState({
    foodName: "",
    quantityKg: "",
    quantityUnits: "",
    preparedAt: "",
    expiryEstimate: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [foodAnalysisId, setFoodAnalysisId] = useState("");
  const [locationMode, setLocationMode] = useState(""); // "" | "current" | "map"
  const [publishLocation, setPublishLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const captureLocation = async () => requestBrowserLocation();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocationError("");
    setSubmitError("");
    if (!imageFile) return;
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
      data.append("foodImage", imageFile);
      await api.post("/donations", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/feed");
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to post donation");
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Post a donation
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Location and a photo of the food are required. NGOs and others can then find and claim it.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70"
      >
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click on the map to select where you’re publishing this donation from.
              </p>
              {!googleMapsEnabled && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                  Map click-to-pick requires Google Maps to be enabled. You can still set the location by entering
                  latitude/longitude below.
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200" htmlFor="manualLat">
                    Latitude
                  </label>
                  <input
                    id="manualLat"
                    value={manualLat}
                    onChange={(e) => updateManualLocation(e.target.value, manualLng)}
                    placeholder="e.g., 12.9716"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200" htmlFor="manualLng">
                    Longitude
                  </label>
                  <input
                    id="manualLng"
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
                height="260px"
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

        <div className="space-y-1">
          <label className="text-xs text-slate-600 dark:text-slate-300" htmlFor="foodName">
            Food name <span className="text-rose-500">*</span>
          </label>
          <input
            id="foodName"
            name="foodName"
            required
            value={form.foodName}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300" htmlFor="preparedAt">
              Prepared at <span className="text-rose-500">*</span>
            </label>
            <input
              id="preparedAt"
              name="preparedAt"
              type="datetime-local"
              required
              value={form.preparedAt}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
        {submitError && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{submitError}</p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Location is required to publish. Choose current location or pick it on the map.
        </p>
        <button
          type="submit"
          disabled={submitting || !locationMode || !publishLocation}
          className="w-full rounded-lg bg-primary-600 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
        >
          {submitting ? "Publishing..." : "Publish donation"}
        </button>
      </form>
    </div>
  );
};
