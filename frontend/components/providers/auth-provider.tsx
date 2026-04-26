"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter, usePathname } from "next/navigation";
import { setWalletAddress } from "@/lib/api";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, connected, connecting } = useWallet();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [graceExpired, setGraceExpired] = useState(false);
  const hasEverConnected = useRef(false);

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
