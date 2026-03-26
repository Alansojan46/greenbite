import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { DonationCard } from "../components/DonationCard.jsx";
import { MapView } from "../components/MapView.jsx";
import { ClaimSuccessModal } from "../components/ClaimSuccessModal.jsx";
import { DonationDetailsModal } from "../components/DonationDetailsModal.jsx";
import { requestBrowserLocation } from "../utils/geolocation.js";

export const DonationFeed = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [claimedDonation, setClaimedDonation] = useState(null);
  const [detailsDonation, setDetailsDonation] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const donationIdParam = searchParams.get("donationId");

  const role = user?.role?.toLowerCase?.();
  const canClaim = !!user && (role === "ngo" || role === "regular");

  const loadDonations = async (loc) => {
    setLoading(true);
    const activeLoc = loc || userLocation;
    const params = new URLSearchParams();
    if (activeLoc?.lat != null && activeLoc?.lng != null) {
      params.set("lat", String(activeLoc.lat));
      params.set("lng", String(activeLoc.lng));
      params.set("sort", "nearest");
    }
    const res = await api.get(`/donations${params.toString() ? `?${params}` : ""}`);
    setDonations(res.data);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGeoError("");
      if (canClaim) {
        const loc = await requestBrowserLocation();
        if (!cancelled && loc) {
          setUserLocation(loc);
          await loadDonations(loc);
          return;
        }
      }
      if (!cancelled) await loadDonations();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canClaim]);

  useEffect(() => {
    if (!donationIdParam) return;
    if (detailsDonation?._id === donationIdParam) return;
    const found = donations.find((d) => d?._id === donationIdParam);
    if (found) setDetailsDonation(found);
  }, [donationIdParam, donations, detailsDonation?._id]);

  const handleClaim = async (id, servings) => {
    try {
      setGeoError("");
      const loc = await requestBrowserLocation();
      if (!loc) {
        setGeoError("Location is required to claim a donation. Please allow location access and try again.");
        return;
      }
      const res = await api.put(`/donations/${id}/claim`, { amount: servings, location: loc });
      setClaimedDonation(res.data);
      setUserLocation(loc);
      await loadDonations(loc);
    } catch {
      await loadDonations();
    }
  };

  const mapMarkers = donations
    .filter((d) => d.location && d.location.lat != null && d.location.lng != null)
    .map((d) => ({
      position: { lat: d.location.lat, lng: d.location.lng },
      label: d.foodName || "Donation"
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Live donation feed</h2>
        <button
          type="button"
          onClick={loadDonations}
          className="rounded-full bg-slate-200 px-3 py-1 text-[11px] text-slate-600 ring-1 ring-slate-300 hover:bg-slate-300 hover:text-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading donations near you...</p>
      )}

      {geoError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          {geoError}
        </div>
      )}

      {!loading && donations.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No donations available yet. Encourage local donors to publish their surplus.
        </p>
      )}

      {!loading && mapMarkers.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Donation locations</p>
          <MapView markers={mapMarkers} height="320px" />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {donations.map((d) => (
          <DonationCard
            key={d._id}
            donation={d}
            canClaim={canClaim}
            onClaim={(servings) => handleClaim(d._id, servings)}
            onViewDetails={(donation) => {
              setDetailsDonation(donation);
              const next = new URLSearchParams(searchParams);
              next.set("donationId", donation._id);
              setSearchParams(next, { replace: true });
            }}
          />
        ))}
      </div>
      {claimedDonation && (
        <ClaimSuccessModal
          donation={claimedDonation}
          onClose={() => setClaimedDonation(null)}
        />
      )}
      {detailsDonation && (
        <DonationDetailsModal
          donation={detailsDonation}
          onClose={() => {
            setDetailsDonation(null);
            const next = new URLSearchParams(searchParams);
            next.delete("donationId");
            setSearchParams(next, { replace: true });
          }}
        />
      )}
    </div>
  );
};
