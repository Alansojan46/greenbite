import React, { useEffect, useMemo } from "react";
import { MapView } from "./MapView.jsx";

const safeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const formatDateTime = (value) => {
  const d = safeDate(value);
  if (!d) return "-";
  return d.toLocaleString();
};

const formatNumber = (value) => {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  // Preserve integers, keep 2 decimals for floats like kg.
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
};

const statusBadgeClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "available") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
  if (s === "claimed") return "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
  if (s === "completed") return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  if (s === "expired") return "bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200";
  return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
};

export const DonationDetailsModal = ({ donation, onClose }) => {
  const d = donation || null;

  useEffect(() => {
    if (!d) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [d, onClose]);

  const mapsUrl = useMemo(() => {
    const loc = d?.location;
    if (!loc || loc.lat == null || loc.lng == null) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${loc.lat},${loc.lng}`
    )}`;
  }, [d]);

  const unitsTotal = d?.quantityUnits ?? null;
  const unitsRemaining = d?.remainingUnits != null ? d.remainingUnits : unitsTotal;
  const kgTotal = d?.quantityKg ?? null;
  const kgRemaining = d?.remainingKg != null ? d.remainingKg : kgTotal;

  if (!d) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Donation details"
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
              {d.foodName || "Donation"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Posted: <span className="font-medium">{formatDateTime(d.createdAt)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(
                d.status
              )}`}
            >
              {d.status || "-"}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
              aria-label="Close"
            >
              x
            </button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            {d.foodImage ? (
              <img
                src={d.foodImage}
                alt={d.foodName ? `${d.foodName} photo` : "Food photo"}
                className="h-56 w-full rounded-xl border border-slate-200 object-cover dark:border-slate-800"
                loading="lazy"
              />
            ) : (
              <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                No image
              </div>
            )}

            {d.location?.lat != null && d.location?.lng != null && (
              <div className="space-y-2">
                <MapView donorLocation={d.location} height="220px" zoom={14} />
                <div className="flex flex-wrap items-center gap-2">
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-500"
                    >
                      Open in Google Maps
                    </a>
                  )}
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Location: {d.location.lat.toFixed(6)}, {d.location.lng.toFixed(6)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Impact</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatNumber(d.impactScore)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Spoilage risk</p>
                <p className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {formatNumber(d.spoilageRisk)}%
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                Details
              </h4>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-700 dark:text-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Prepared at</dt>
                  <dd className="font-medium">{formatDateTime(d.preparedAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Expires around</dt>
                  <dd className="font-medium">{formatDateTime(d.expiryEstimate)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Units (remaining/total)</dt>
                  <dd className="font-medium">
                    {formatNumber(unitsRemaining)} / {formatNumber(unitsTotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Kg (remaining/total)</dt>
                  <dd className="font-medium">
                    {formatNumber(kgRemaining)} / {formatNumber(kgTotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Last updated</dt>
                  <dd className="font-medium">{formatDateTime(d.updatedAt)}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                Claim history
              </h4>
              {Array.isArray(d.claims) && d.claims.length > 0 ? (
                <div className="mt-3 space-y-2 text-xs">
                  {d.claims
                    .slice()
                    .reverse()
                    .slice(0, 6)
                    .map((c, idx) => {
                      const who =
                        typeof c?.claimerId === "object" && c?.claimerId?.name
                          ? c.claimerId.name
                          : c?.claimerId
                          ? String(c.claimerId)
                          : "Unknown";
                      const amount =
                        c?.servings != null
                          ? `${formatNumber(c.servings)} portions`
                          : c?.units != null
                          ? `${formatNumber(c.units)} units`
                          : c?.kg != null
                          ? `${formatNumber(c.kg)} kg`
                          : "-";
                      return (
                        <div
                          key={`${c?.claimedAt || "t"}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-950/40 dark:text-slate-200"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{who}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {formatDateTime(c?.claimedAt)}
                            </p>
                          </div>
                          <span className="whitespace-nowrap font-semibold">{amount}</span>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  No claims yet.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
