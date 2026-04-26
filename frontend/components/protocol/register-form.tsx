"use client";

import { useState, useCallback } from "react";
import { isValidSolanaPublicKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Protocol, RegisterProtocolRequest } from "@/types";

interface RegisterFormProps {
  /** Called with the newly created protocol on successful registration. */
  onSuccess?: (protocol: Protocol) => void;
}

/**
 * Form for registering a new Solana protocol with Killswitch.
 * Validates program address as a Solana public key.
 * Currently uses console.log + success toast (will wire to API later).
 */
export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [programAddress, setProgramAddress] = useState("");
  const [protocolName, setProtocolName] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");

  const [addressError, setAddressError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  /** Validate program address on blur. */
  const validateAddress = useCallback(() => {
    if (!programAddress.trim()) {
      setAddressError("Program address is required");
      return false;
    }
    if (!isValidSolanaPublicKey(programAddress.trim())) {
      setAddressError("Invalid Solana public key format");
      return false;
    }
    setAddressError(null);
    return true;
  }, [programAddress]);

  /** Validate protocol name. */
  const validateName = useCallback(() => {
    if (!protocolName.trim()) {
      setNameError("Protocol name is required");
      return false;
    }
    setNameError(null);
    return true;
  }, [protocolName]);

  /** Handle form submission — dummy data for now. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    const isAddressValid = validateAddress();
    const isNameValid = validateName();
    if (!isAddressValid || !isNameValid) return;

    setIsSubmitting(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const body: RegisterProtocolRequest = {
      program_address: programAddress.trim(),
      name: protocolName.trim(),
    };
    if (telegramChatId.trim()) {
      body.telegram_chat_id = telegramChatId.trim();
    }

    // Dummy: log data and show success toast (will wire to API later)
    console.log("[RegisterForm] Submit:", body);

    const dummyProtocol: Protocol = {
      id: `proto-${Date.now()}`,
      program_address: body.program_address,
      name: body.name,
      guardian_wallet: "DummyGuardianWallet1234567890abcdefghijk",
      telegram_chat_id: body.telegram_chat_id ?? "",
      status: "active",
      created_at: new Date().toISOString(),
      invariants: [],
    };

    setToast({ type: "success", message: "Protocol registered successfully!" });
    setIsSubmitting(false);

    // Reset form
    setProgramAddress("");
    setProtocolName("");
    setTelegramChatId("");

    onSuccess?.(dummyProtocol);
  };

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

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Program Address */}
        <div className="space-y-1.5">
          <label
            htmlFor="program-address"
            className="block text-sm font-medium text-foreground"
          >
            Program Address <span className="text-status-red">*</span>
          </label>
          <input
            id="program-address"
            type="text"
            value={programAddress}
            onChange={(e) => {
              setProgramAddress(e.target.value);
              if (addressError) setAddressError(null);
            }}
            onBlur={validateAddress}
            placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
            className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isSubmitting}
          />
          {addressError && (
            <p className="text-xs text-status-red">{addressError}</p>
          )}
        </div>

        {/* Protocol Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="protocol-name"
            className="block text-sm font-medium text-foreground"
          >
            Protocol Name <span className="text-status-red">*</span>
          </label>
          <input
            id="protocol-name"
            type="text"
            value={protocolName}
            onChange={(e) => {
              setProtocolName(e.target.value);
              if (nameError) setNameError(null);
            }}
            onBlur={validateName}
            placeholder="e.g. Drift Protocol"
            className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isSubmitting}
          />
          {nameError && (
            <p className="text-xs text-status-red">{nameError}</p>
          )}
        </div>

        {/* Telegram Chat ID */}
        <div className="space-y-1.5">
          <label
            htmlFor="telegram-chat-id"
            className="block text-sm font-medium text-foreground"
          >
            Telegram Chat ID{" "}
            <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <input
            id="telegram-chat-id"
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            placeholder="e.g. -100123456789"
            className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isSubmitting}
          />
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          size="lg"
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
              Registering...
            </span>
          ) : (
            "Register Protocol"
          )}
        </Button>
      </form>
    </div>
  );
}
