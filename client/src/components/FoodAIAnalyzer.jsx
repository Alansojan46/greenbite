import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";

const badgeClasses = (risk) => {
  if (risk === "High") return "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/30 dark:text-rose-200";
  if (risk === "Medium") return "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-200";
  return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-200";
};

const urgencyLabel = (n) => {
  const v = Number(n) || 1;
  if (v >= 5) return "Critical";
  if (v >= 3) return "Moderate";
  return "Safe";
};

export const FoodAIAnalyzer = ({
  file: fileProp,
  preparedAt: preparedAtProp,
  showInputs = true,
  showPreparedAt = true,
  onFileChange,
  onPreparedAtChange,
  onAnalyzed,
  onApply,
}) => {
  const [internalFile, setInternalFile] = useState(null);
  const [internalPreparedAt, setInternalPreparedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState("");

  const file = fileProp ?? internalFile;
  const preparedAt = preparedAtProp ?? internalPreparedAt;

  const previewUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleAnalyze = async () => {
    setError("");
    setResult(null);

    if (!file) {
      setError("Please choose a food image.");
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append("image", file);
      if (preparedAt) data.append("preparedAt", preparedAt);

      const res = await api.post("/ai/analyze-food", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
      setSelectedLabel(res.data?.foodType || "");
      if (typeof onAnalyzed === "function") onAnalyzed(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to analyze image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          AI Food Verification
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Upload a food image to detect type, approximate servings, and freshness risk.
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          {showInputs && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="foodImageAi">
                Food image
              </label>
              <input
                id="foodImageAi"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setInternalFile(f);
                  if (typeof onFileChange === "function") onFileChange(f);
                }}
                className="w-full text-xs text-slate-600 dark:text-slate-300"
              />
            </div>
          )}

          {showPreparedAt && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="preparedAtAi">
                Prepared at (optional)
              </label>
              <input
                id="preparedAtAi"
                type="datetime-local"
                value={preparedAt}
                onChange={(e) => {
                  const v = e.target.value;
                  setInternalPreparedAt(v);
                  if (typeof onPreparedAtChange === "function") onPreparedAtChange(v);
                }}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </div>

        {previewUrl && (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <img
              src={previewUrl}
              alt="Preview"
              className="h-44 w-full object-cover"
            />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full rounded-lg bg-primary-600 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-950"
        >
          {loading ? "Analyzing..." : "Analyze image"}
        </button>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary-600" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary-600 [animation-delay:120ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary-600 [animation-delay:240ms]" />
            <span>Running vision analysis…</span>
          </div>
        )}
      </div>

      {result && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              AI Analysis Report
            </h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClasses(result.freshnessRisk)}`}>
              {result.freshnessRisk === "High"
                ? "Critical"
                : result.freshnessRisk === "Medium"
                ? "Moderate"
                : "Safe"}
            </span>
          </div>

          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-400">Food Detected:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{result.foodType}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-400">Estimated Servings:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{result.estimatedServings}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-400">Freshness Risk:</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClasses(result.freshnessRisk)}`}>
                {result.freshnessRisk}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-400">AI Confidence:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{result.aiConfidence}%</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-400">Urgency Level:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {result.urgencyLevel} ({urgencyLabel(result.urgencyLevel)})
              </span>
            </div>
          </div>

          {result.summary && (
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              {result.summary}
            </p>
          )}

          {Array.isArray(result.candidates) && result.candidates.length > 0 && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60">
              <p className="mb-2 font-semibold text-slate-800 dark:text-slate-100">
                Top guesses (pick the correct one if needed)
              </p>
              <select
                value={selectedLabel || result.foodType}
                onChange={(e) => setSelectedLabel(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {[result.foodType, ...result.candidates.map((c) => c.label)]
                  .filter(Boolean)
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((label) => {
                    const cand = result.candidates.find((c) => c.label === label);
                    const conf = cand?.confidence != null ? ` (${cand.confidence}%)` : "";
                    return (
                      <option key={label} value={label}>
                        {label}{conf}
                      </option>
                    );
                  })}
              </select>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (result?.analysisId && selectedLabel) {
                        await api.post("/ai/food-feedback", {
                          analysisId: result.analysisId,
                          correctFoodType: selectedLabel,
                        });
                      }
                    } catch {
                      // ignore
                    }
                  }}
                  className="rounded-lg bg-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Save correction
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedLabel) return;
                    // Update the report locally so Apply uses the corrected type.
                    setResult((p) => (p ? { ...p, foodType: selectedLabel } : p));
                  }}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                >
                  Use this label
                </button>
              </div>
            </div>
          )}

          {typeof onApply === "function" && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => onApply(result)}
                className="w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
              >
                Apply to donation form
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
