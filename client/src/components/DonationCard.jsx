import React from "react";

export const DonationCard = ({ donation, onClaim, canClaim, onViewDetails }) => {
  const {
    foodName,
    quantityKg,
    quantityUnits,
    estimatedPeopleServed,
    remainingPeopleServed,
    remainingUnits,
    remainingKg,
    impactScore,
    spoilageRisk,
    status,
    donorId,
  } = donation;

  const servingsTotal = estimatedPeopleServed != null ? Number(estimatedPeopleServed) : 0;
  const servingsRemaining =
    remainingPeopleServed != null ? Number(remainingPeopleServed) : servingsTotal;

  const unitsTotal = quantityUnits != null ? Number(quantityUnits) : 0;
  const unitsRemaining = remainingUnits != null ? Number(remainingUnits) : unitsTotal;

  const kgTotal = quantityKg != null ? Number(quantityKg) : 0;
  const kgRemaining = remainingKg != null ? Number(remainingKg) : kgTotal;

  const claimMode =
    servingsRemaining > 0 ? "servings" : unitsRemaining > 0 ? "units" : kgRemaining > 0 ? "kg" : null;

  const remainingByMode =
    claimMode === "servings" ? servingsRemaining : claimMode === "units" ? unitsRemaining : kgRemaining;
  const totalByMode =
    claimMode === "servings" ? servingsTotal : claimMode === "units" ? unitsTotal : kgTotal;
  const unitLabel = claimMode || "amount";

  const [claimAmount, setClaimAmount] = React.useState(1);

  React.useEffect(() => {
    if (!claimMode) {
      setClaimAmount(1);
      return;
    }
    // Default to a small chunk, but never exceed remaining.
    const max = Math.max(1, Number(remainingByMode) || 1);
    const suggested = claimMode === "kg" ? Math.min(1, max) : Math.min(10, max);
    setClaimAmount(Math.max(1, suggested));
  }, [donation?._id, claimMode, remainingByMode]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-slate-900/50">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{foodName}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {claimMode
              ? `${remainingByMode}${totalByMode ? ` / ${totalByMode}` : ""} ${unitLabel}`
              : "Quantity not set"}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            status === "available"
              ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/40 dark:text-emerald-300"
              : status === "claimed"
              ? "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/40 dark:text-amber-300"
              : "bg-slate-200 text-slate-600 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-600/50"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-300">
        {quantityKg && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
            {quantityKg} kg
          </span>
        )}
        {quantityUnits && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
            {quantityUnits} units
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
          Impact: <span className="font-semibold text-emerald-600 dark:text-emerald-300">{impactScore}</span>
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
          Spoilage:{" "}
          <span className="font-semibold text-amber-600 dark:text-amber-300">{spoilageRisk}%</span>
        </span>
      </div>

      {donorId?.organizationName && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Donor:{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {donorId.organizationName}
          </span>
        </p>
      )}

      <div className="mt-2 flex items-center justify-between">
        {typeof onViewDetails === "function" ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onViewDetails(donation);
            }}
            className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            View details
          </button>
        ) : (
          <span />
        )}
        {canClaim && status === "available" && claimMode && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max={Math.max(1, Number(remainingByMode) || 1)}
              value={claimAmount}
              onChange={(e) => setClaimAmount(Number(e.target.value) || 1)}
              className="w-20 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              title="Amount to claim"
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{unitLabel}</span>
          </div>
        )}
        <button
          type="button"
          disabled={status !== "available" || !canClaim || !claimMode}
          onClick={(e) => {
            e.preventDefault();
            if (status === "available" && canClaim && claimMode) onClaim(claimAmount);
          }}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            canClaim && status === "available" && claimMode
              ? "bg-primary-600 text-white hover:bg-primary-500 cursor-pointer dark:text-slate-950"
              : "bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
          }`}
        >
          Claim
        </button>
      </div>
    </div>
  );
};
