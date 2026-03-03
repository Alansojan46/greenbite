import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { DonationCard } from "../components/DonationCard.jsx";
import { MapView } from "../components/MapView.jsx";
import { ClaimSuccessModal } from "../components/ClaimSuccessModal.jsx";
import { DonationDetailsModal } from "../components/DonationDetailsModal.jsx";

export const DonationFeed = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimedDonation, setClaimedDonation] = useState(null);
  const [detailsDonation, setDetailsDonation] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const donationIdParam = searchParams.get("donationId");

  const loadDonations = async () => {
    setLoading(true);
    const res = await api.get("/donations");
    setDonations(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadDonations();
  }, []);

  useEffect(() => {
    if (!donationIdParam) return;
    if (detailsDonation?._id === donationIdParam) return;
    const found = donations.find((d) => d?._id === donationIdParam);
    if (found) setDetailsDonation(found);
  }, [donationIdParam, donations, detailsDonation?._id]);

  const handleClaim = async (id, servings) => {
    try {
      const res = await api.put(`/donations/${id}/claim`, servings ? { amount: servings } : {});
      setClaimedDonation(res.data);
      await loadDonations();
    } catch {
      await loadDonations();
    }
  };

  const role = user?.role?.toLowerCase?.();
  const canClaim = !!user && (role === "ngo" || role === "regular");

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
