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
  const [customLabel, setCustomLabel] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackOk, setFeedbackOk] = useState("");
  const [showCorrection, setShowCorrection] = useState(false);

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
    setFeedbackError("");
    setFeedbackOk("");
    setShowCorrection(false);
    setCustomLabel("");

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

  const canSendFeedback = !!result?.analysisId;

  const submitFeedback = async ({ isCorrect, correctedFoodType, okMessage }) => {
    if (!result?.analysisId) return;
    setFeedbackError("");
    setFeedbackOk("");
    setFeedbackLoading(true);
    try {
      await api.post("/ai/food-feedback", {
        analysisId: result.analysisId,
        isCorrect,
        correctedFoodType,
      });
      setFeedbackOk(okMessage || "Feedback saved.");
    } catch (err) {
      setFeedbackError(err?.response?.data?.message || err?.message || "Failed to save feedback.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const applyLabelLocally = (label) => {
    if (!label) return;
    setSelectedLabel(label);
    setResult((p) => (p ? { ...p, foodType: label } : p));
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
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {result.aiConfidence}%
              </span>
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

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedLabel) return;
                    applyLabelLocally(selectedLabel);
                    if (canSendFeedback) {
                      await submitFeedback({
                        isCorrect: false,
                        correctedFoodType: selectedLabel,
                        okMessage: "Saved. We’ll use this correction next time.",
                      });
                    }
                    if (typeof onApply === "function") onApply({ ...result, foodType: selectedLabel });
                  }}
                  disabled={feedbackLoading}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                >
                  Use this label
                </button>
                <button
                  type="button"
                  onClick={() => setShowCorrection((p) => !p)}
                  className="rounded-lg bg-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {showCorrection ? "Hide custom label" : "Type custom label"}
                </button>
              </div>

              <div className="mt-2">
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  Is the selected label correct?
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!canSendFeedback) return;
                      await submitFeedback({ isCorrect: true, okMessage: "Thanks! We’ll use this feedback next time." });
                    }}
                    disabled={!canSendFeedback || feedbackLoading}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCorrection(true)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-500"
                  >
                    No
                  </button>
                </div>
              </div>

              {showCorrection && (
                <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/30">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200" htmlFor="customFoodLabel">
                    Correct food name (type if needed)
                  </label>
                  <input
                    id="customFoodLabel"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Type the correct label"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const label = String(customLabel || "").trim() || String(selectedLabel || "").trim();
                        if (!label) return;
                        applyLabelLocally(label);
                        if (canSendFeedback) {
                          await submitFeedback({
                            isCorrect: false,
                            correctedFoodType: label,
                            okMessage: "Saved. We’ll use this correction next time.",
                          });
                        }
                        setShowCorrection(false);
                      }}
                      disabled={feedbackLoading}
                      className="rounded-lg bg-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Save this correction
                    </button>
                  </div>
                </div>
              )}

              {(feedbackError || feedbackOk) && (
                <div
                  className={`mt-2 rounded-lg border p-2 text-[11px] ${
                    feedbackError
                      ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                  }`}
                >
                  {feedbackError || feedbackOk}
                </div>
              )}
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
