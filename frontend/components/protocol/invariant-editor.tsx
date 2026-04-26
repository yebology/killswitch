"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { INVARIANT_TYPES } from "@/constants";
import type {
  InvariantType,
  InvariantAction,
  Invariant,
  CreateInvariantRequest,
} from "@/types";

interface InvariantEditorProps {
  /** Protocol ID to add the invariant rule to. */
  protocolId: string;
  /** Called with the newly created invariant on success. */
  onSuccess: (invariant: Invariant) => void;
}

/**
 * Form for adding a new invariant rule to a protocol.
 * Pre-fills threshold and time window from INVARIANT_TYPES defaults when type changes.
 * Currently uses console.log (will wire to API later).
 */
export function InvariantEditor({ protocolId, onSuccess }: InvariantEditorProps) {
  const [type, setType] = useState<InvariantType>(INVARIANT_TYPES[0].value);
  const [threshold, setThreshold] = useState<string>(
    String(INVARIANT_TYPES[0].defaultThreshold)
  );
  const [timeWindow, setTimeWindow] = useState<string>(
    String(INVARIANT_TYPES[0].defaultTimeWindow)
  );
  const [action, setAction] = useState<InvariantAction>("pause");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [timeWindowError, setTimeWindowError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  /** Pre-fill defaults when invariant type changes. */
  useEffect(() => {
    const info = INVARIANT_TYPES.find((t) => t.value === type);
    if (info) {
      setThreshold(String(info.defaultThreshold));
      setTimeWindow(String(info.defaultTimeWindow));
    }
  }, [type]);

  /** Auto-dismiss toast after 4 seconds. */
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4_000);
    return () => clearTimeout(timer);
  }, [toast]);

  /** Reset form to initial state. */
  const resetForm = useCallback(() => {
    const firstType = INVARIANT_TYPES[0];
    setType(firstType.value);
    setThreshold(String(firstType.defaultThreshold));
    setTimeWindow(String(firstType.defaultTimeWindow));
    setAction("pause");
    setThresholdError(null);
    setTimeWindowError(null);
  }, []);

  /** Handle form submission — dummy data for now. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    const thresholdNum = Number(threshold);
    const timeWindowNum = Number(timeWindow);
    let hasError = false;

    if (!thresholdNum || thresholdNum <= 0) {
      setThresholdError("Threshold must be greater than 0");
      hasError = true;
    } else {
      setThresholdError(null);
    }

    if (!timeWindowNum || timeWindowNum <= 0) {
      setTimeWindowError("Time window must be greater than 0");
      hasError = true;
    } else {
      setTimeWindowError(null);
    }

    if (hasError) return;

    setIsSubmitting(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    const body: CreateInvariantRequest = {
      type,
      threshold: thresholdNum,
      time_window: timeWindowNum,
      action,
    };

    // Dummy: log data and call onSuccess (will wire to API later)
    console.log("[InvariantEditor] Submit:", { protocolId, ...body });

    const dummyInvariant: Invariant = {
      id: `inv-${Date.now()}`,
      protocol_id: protocolId,
      type,
      threshold: thresholdNum,
      time_window: timeWindowNum,
      action,
      enabled: true,
    };

    setToast({ type: "success", message: "Rule added successfully!" });
    resetForm();
    setIsSubmitting(false);
    onSuccess(dummyInvariant);
  };

  const selectedTypeInfo = INVARIANT_TYPES.find((t) => t.value === type);

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {toast && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            toast.type === "success"
              ? "border-status-green/30 bg-status-green/10 text-status-green"
              : "border-status-red/30 bg-status-red/10 text-status-red"
          }`}
        >
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Invariant Type */}
        <div className="space-y-1.5">
          <label
            htmlFor="invariant-type"
            className="block text-sm font-medium text-foreground"
          >
            Rule Type
          </label>
          <select
            id="invariant-type"
            value={type}
            onChange={(e) => setType(e.target.value as InvariantType)}
            className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isSubmitting}
          >
            {INVARIANT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {selectedTypeInfo && (
            <p className="text-xs text-muted-foreground">
              {selectedTypeInfo.description}
            </p>
          )}
        </div>

        {/* Threshold */}
        <div className="space-y-1.5">
          <label
            htmlFor="threshold"
            className="block text-sm font-medium text-foreground"
          >
            Threshold{" "}
            {selectedTypeInfo && (
              <span className="text-xs text-muted-foreground">
                ({selectedTypeInfo.unit})
              </span>
            )}
          </label>
          <input
            id="threshold"
            type="number"
            value={threshold}
            onChange={(e) => {
              setThreshold(e.target.value);
              if (thresholdError) setThresholdError(null);
            }}
            min="1"
            step="any"
            placeholder="e.g. 5000000"
            className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isSubmitting}
          />
          {thresholdError && (
            <p className="text-xs text-status-red">{thresholdError}</p>
          )}
        </div>

        {/* Time Window */}
        <div className="space-y-1.5">
          <label
            htmlFor="time-window"
            className="block text-sm font-medium text-foreground"
          >
            Time Window{" "}
            <span className="text-xs text-muted-foreground">(seconds)</span>
          </label>
          <input
            id="time-window"
            type="number"
            value={timeWindow}
            onChange={(e) => {
              setTimeWindow(e.target.value);
              if (timeWindowError) setTimeWindowError(null);
            }}
            min="1"
            step="1"
            placeholder="e.g. 60"
            className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isSubmitting}
          />
          {timeWindowError && (
            <p className="text-xs text-status-red">{timeWindowError}</p>
          )}
        </div>

        {/* Action */}
        <div className="space-y-2">
          <span className="block text-sm font-medium text-foreground">
            Action on Breach
          </span>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="action"
                value="pause"
                checked={action === "pause"}
                onChange={() => setAction("pause")}
                className="h-4 w-4 border-border text-primary accent-primary focus:ring-primary"
                disabled={isSubmitting}
              />
              <span className="text-sm text-foreground">Pause Protocol</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="action"
                value="alert"
                checked={action === "alert"}
                onChange={() => setAction("alert")}
                className="h-4 w-4 border-border text-primary accent-primary focus:ring-primary"
                disabled={isSubmitting}
              />
              <span className="text-sm text-foreground">Alert Only</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Adding Rule...
            </span>
          ) : (
            "Add Rule"
          )}
        </Button>
      </form>
    </div>
  );
}
