import React from "react";
import { MapView } from "./MapView.jsx";

export const ClaimSuccessModal = ({ donation, onClose }) => {
  if (!donation) return null;
  const donor = donation.donorId;
  const location = donor?.location || donation?.location;
  const mapsUrl =
    location?.lat != null && location?.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Pickup details
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          Your claim for <strong>{donation.foodName}</strong> was successful. Go to the donor to pick up the food.
        </p>
        {donor && (
          <div className="space-y-2 text-sm">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {donor.organizationName || donor.name}
            </p>
            {donor.address && (
              <p className="text-slate-600 dark:text-slate-400">{donor.address}</p>
            )}
            {donor.phone && (
              <p>
                <a
                  href={`tel:${donor.phone}`}
                  className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  {donor.phone}
                </a>
              </p>
            )}
          </div>
        )}
        {location && (
          <div className="mt-4">
            <MapView
              donorLocation={location}
              height="220px"
              zoom={14}
            />
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
              >
                Open in Google Maps
              </a>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300"
        >
          Done
        </button>
      </div>
    </div>
  );
};
