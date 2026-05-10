"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter, usePathname } from "next/navigation";
import { setWalletAddress, post } from "@/lib/api";
import type { AuthVerifyRequest, AuthVerifyResponse } from "@/types";

interface AuthContextType {
  walletAddress: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  walletAddress: null,
  isAuthenticated: false,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

const PUBLIC_ROUTES = ["/", "/simulate"];

/**
 * Time in ms to wait for autoConnect before enforcing route protection.
 * autoConnect typically resolves within 500ms.
 */
const AUTO_CONNECT_GRACE_PERIOD = 1500;

/** Message the user signs to prove wallet ownership. */
const AUTH_MESSAGE = "Sign this message to authenticate with Killswitch";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, connected, connecting, signMessage } = useWallet();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [graceExpired, setGraceExpired] = useState(false);
  const hasEverConnected = useRef(false);
  const hasVerified = useRef(false);

  useEffect(() => {
    setMounted(true);
    // Give autoConnect time to restore the wallet before enforcing redirects
    const timer = setTimeout(() => setGraceExpired(true), AUTO_CONNECT_GRACE_PERIOD);
    return () => clearTimeout(timer);
  }, []);

  // Track if wallet has ever connected in this session
  if (connected) {
    hasEverConnected.current = true;
  }

  // Sync wallet address with API client
  const walletAddr = connected && publicKey ? publicKey.toBase58() : null;

  useEffect(() => {
    setWalletAddress(walletAddr);
  }, [walletAddr]);

  // Verify wallet with backend when connected
  useEffect(() => {
    if (!walletAddr || !signMessage || hasVerified.current) return;

    let cancelled = false;

    const verify = async () => {
      try {
        const messageBytes = new TextEncoder().encode(AUTH_MESSAGE);
        const signature = await signMessage(messageBytes);
        const signatureBase64 = Buffer.from(signature).toString("base64");

        const body: AuthVerifyRequest = {
          wallet_address: walletAddr,
          message: AUTH_MESSAGE,
          signature: signatureBase64,
        };

        await post<AuthVerifyResponse>("/api/auth/verify", body);

        if (!cancelled) {
          hasVerified.current = true;
        }
      } catch {
        // Graceful fallback: if backend is not running or verify fails,
        // still allow the user to use the app with wallet connection as auth.
        // Don't block the UI.
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [walletAddr, signMessage]);

  // Reset verification state when wallet disconnects
  useEffect(() => {
    if (!connected) {
      hasVerified.current = false;
    }
  }, [connected]);

  // Route protection — only enforce after grace period AND not connecting
  useEffect(() => {
    if (!mounted || !graceExpired || connecting) return;

    const isPublic = PUBLIC_ROUTES.some(
      (route) => pathname === route || (route !== "/" && pathname.startsWith(route))
    );

    if (!isPublic && !connected) {
      router.push("/");
    }
  }, [pathname, connected, connecting, router, mounted, graceExpired]);

  const isLoading = !mounted || (!graceExpired && !connected);

  return (
    <AuthContext.Provider
      value={{
        walletAddress: walletAddr,
        isAuthenticated: !!walletAddr,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
