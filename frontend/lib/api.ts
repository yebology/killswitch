import type { APIEnvelope } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Stored wallet address used as auth identity. */
let walletAddress: string | null = null;

/** Set the authenticated wallet address for API requests. */
export function setWalletAddress(address: string | null): void {
  walletAddress = address;
}

/** Get the current authenticated wallet address. */
export function getWalletAddress(): string | null {
  return walletAddress;
}

/** API error with status code and message from backend. */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Internal fetch wrapper that handles headers, envelope parsing, and errors.
 */
async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (walletAddress) {
    headers["X-Wallet-Address"] = walletAddress;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const envelope: APIEnvelope<T> = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, envelope.message ?? "Unknown error");
  }

  return envelope.data as T;
}

/** GET request to the backend API. */
export async function get<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

/** POST request to the backend API. */
export async function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, body);
}
