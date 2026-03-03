import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { FoodAIAnalyzer } from "../components/FoodAIAnalyzer.jsx";

export const AddDonationPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    foodName: "",
    quantityKg: "",
    quantityUnits: "",
    estimatedPeopleServed: "",
    preparedAt: "",
    expiryEstimate: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [foodAnalysisId, setFoodAnalysisId] = useState("");

  const captureLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
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
    if (!imageFile) return;
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
        <div className="space-y-1">
          <label className="text-xs text-slate-600 dark:text-slate-300" htmlFor="estimatedPeopleServed">
            Estimated people served
          </label>
          <input
            id="estimatedPeopleServed"
            name="estimatedPeopleServed"
            type="number"
            value={form.estimatedPeopleServed}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
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
              foodName: p.foodName || r?.foodType || "",
              estimatedPeopleServed:
                p.estimatedPeopleServed || String(r?.estimatedServings || ""),
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
          Your current location will be captured when you submit. Please allow location access.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary-600 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
        >
          {submitting ? "Publishing..." : "Publish donation"}
        </button>
      </form>
    </div>
  );
};
