import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api.js";
import { DonationCard } from "../components/DonationCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { DonationDetailsModal } from "../components/DonationDetailsModal.jsx";
import { requestBrowserLocation } from "../utils/geolocation.js";

export const AIInsightsPage = () => {
  const { user } = useAuth();
  const [topImpact, setTopImpact] = useState([]);
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [claimingId, setClaimingId] = useState("");
  const [detailsDonation, setDetailsDonation] = useState(null);

  const load = useCallback(async (locOverride) => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const activeLoc = locOverride || userLocation;
      if (activeLoc?.lat != null && activeLoc?.lng != null) {
        params.set("lat", String(activeLoc.lat));
        params.set("lng", String(activeLoc.lng));
      }
      const res = await api.get(`/donations/ai-suggestions${params.toString() ? `?${params}` : ""}`);
      setTopImpact(res.data.topImpactDonations || []);
      setLatest(res.data.latestDonations || []);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load AI insights.";
      setError(message);
      setTopImpact([]);
      setLatest([]);
    } finally {
      setLoading(false);
    }
  }, [userLocation?.lat, userLocation?.lng]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const role = user?.role?.toLowerCase?.();
      const canClaim = !!user && (role === "ngo" || role === "regular");
      if (canClaim) {
        const loc = await requestBrowserLocation();
        if (!cancelled && loc) setUserLocation(loc);
      }
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const canClaim =
    !!user &&
    (user.role?.toLowerCase() === "ngo" || user.role?.toLowerCase() === "regular");

  const handleClaim = useCallback(
    async (id, servings) => {
      if (!canClaim) return;
      setError("");
      setClaimingId(id);
      try {
        const loc = await requestBrowserLocation();
        if (!loc) {
          setError("Location is required to claim a donation. Please allow location access and try again.");
          return;
        }
        setUserLocation(loc);
        await api.put(`/donations/${id}/claim`, { amount: servings, location: loc });
        // Refresh so status updates (and list stays in sync with server sorting).
        await load(loc);
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to claim donation.";
        setError(message);
      } finally {
        setClaimingId("");
      }
    },
    [canClaim, load]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">AI Insights</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          See which donations offer the highest potential impact based on quantity and
          spoilage risk.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          <div className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={load}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/40"
            />
          ))}
        </div>
      ) : topImpact.length === 0 && latest.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          No high-impact donations to show yet.
          <div className="mt-2">
            <button
              type="button"
              onClick={load}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-500"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : (
      <>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Top impact</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Ranked by impact score (and then newest first).
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {topImpact.map((d) => (
            <DonationCard
              key={d._id}
              donation={d}
              canClaim={canClaim && claimingId !== d._id}
              onClaim={(servings) => handleClaim(d._id, servings)}
              onViewDetails={(donation) => setDetailsDonation(donation)}
            />
          ))}
        </div>

        <div className="pt-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Latest</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Newly posted donations (helps you spot items that may not rank high yet).
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {latest
            .filter((d) => !topImpact.some((t) => t._id === d._id))
            .map((d) => (
              <DonationCard
                key={d._id}
                donation={d}
                canClaim={canClaim && claimingId !== d._id}
                onClaim={(servings) => handleClaim(d._id, servings)}
                onViewDetails={(donation) => setDetailsDonation(donation)}
              />
            ))}
        </div>
      </>
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
