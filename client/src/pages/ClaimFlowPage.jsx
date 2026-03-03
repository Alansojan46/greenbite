import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { DonationCard } from "../components/DonationCard.jsx";
import { MapView } from "../components/MapView.jsx";
import { ClaimSuccessModal } from "../components/ClaimSuccessModal.jsx";
import { DonationDetailsModal } from "../components/DonationDetailsModal.jsx";

export const ClaimFlowPage = () => {
  const { user } = useAuth();
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({
    foodType: "",
    quantity: "",
    urgency: "3",
    lat: "",
    lng: "",
  });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claimedDonation, setClaimedDonation] = useState(null);
  const [detailsDonation, setDetailsDonation] = useState(null);

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

  const handleSubmitRequirements = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let lat = form.lat ? Number(form.lat) : null;
      let lng = form.lng ? Number(form.lng) : null;
      if (lat == null || lng == null) {
        const loc = await captureLocation();
        if (loc) {
          lat = loc.lat;
          lng = loc.lng;
        }
      }
      const params = new URLSearchParams({
        quantity: form.quantity || "0",
        urgency: form.urgency || "3",
        foodType: form.foodType || "",
        limit: "10",
      });
      if (lat != null && lng != null) {
        params.set("lat", lat);
        params.set("lng", lng);
      }
      const res = await api.get(`/ai/match-suggestions?${params}`);
      setSuggestions(res.data.suggestions || []);
      setStep("suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (id, servings) => {
    try {
      const res = await api.put(`/donations/${id}/claim`, servings ? { amount: servings } : {});
      setClaimedDonation(res.data);
      setSuggestions((prev) => prev.filter((s) => s.donation._id !== id));
    } catch {
      // refresh list
      const params = new URLSearchParams({
        quantity: form.quantity || "0",
        urgency: form.urgency || "3",
        foodType: form.foodType || "",
        limit: "10",
      });
      if (form.lat && form.lng) {
        params.set("lat", form.lat);
        params.set("lng", form.lng);
      }
      const res = await api.get(`/ai/match-suggestions?${params}`);
      setSuggestions(res.data.suggestions || []);
    }
  };

  const canClaim = !!user && (user.role?.toLowerCase() === "ngo" || user.role?.toLowerCase() === "regular");
  const mapMarkers = suggestions
    .filter((s) => s.donation?.location?.lat != null)
    .map((s) => ({
      position: s.donation.location,
      label: s.donation.foodName || "Donation",
    }));

  if (step === "form") {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            What do you need?
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Tell us your requirements and we’ll suggest the best nearby donations.
          </p>
        </div>
        <form
          onSubmit={handleSubmitRequirements}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70"
        >
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="foodType">
              Food type (optional)
            </label>
            <input
              id="foodType"
              value={form.foodType}
              onChange={(e) => setForm((p) => ({ ...p, foodType: e.target.value }))}
              placeholder="e.g. rice, vegetables"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="quantity">
              How much do you need? (people served or kg)
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              placeholder="e.g. 50"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="urgency">
              Urgency (1–5)
            </label>
            <select
              id="urgency"
              value={form.urgency}
              onChange={(e) => setForm((p) => ({ ...p, urgency: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "(Low)" : n === 5 ? "(High)" : ""}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your location will be used to find nearby donations. Allow location access when prompted.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
          >
            {loading ? "Finding options..." : "Find best options"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep("form")}
          className="text-sm text-slate-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
        >
          ← Change requirements
        </button>
      </div>
      {mapMarkers.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Donation locations
          </p>
          <MapView markers={mapMarkers} height="280px" />
        </div>
      )}
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Best matches
      </h2>
      {suggestions.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No matching donations right now. Try different requirements or check back later.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {suggestions.map((s) => (
            <div key={s.donation._id} className="space-y-1">
              <DonationCard
                donation={s.donation}
                canClaim={canClaim}
                onClaim={(servings) => handleClaim(s.donation._id, servings)}
                onViewDetails={(donation) => setDetailsDonation(donation)}
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {s.distance} km away · Match score: {s.confidenceScore}
              </p>
            </div>
          ))}
        </div>
      )}
      {claimedDonation && (
        <ClaimSuccessModal
          donation={claimedDonation}
          onClose={() => setClaimedDonation(null)}
        />
      )}
      {detailsDonation && (
        <DonationDetailsModal
          donation={detailsDonation}
          onClose={() => setDetailsDonation(null)}
        />
      )}
    </div>
  );
};
