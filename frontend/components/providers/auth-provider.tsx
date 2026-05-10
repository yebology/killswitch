"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
const AUTO_CONNECT_GRACE_PERIOD = 1500;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, connected, connecting } = useWallet();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [graceExpired, setGraceExpired] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setGraceExpired(true), AUTO_CONNECT_GRACE_PERIOD);
    return () => clearTimeout(timer);
  }, []);

  // Wallet address = identity (no sign message needed for hackathon)
  const walletAddr = connected && publicKey ? publicKey.toBase58() : null;

  // Sync wallet address with API client
  useEffect(() => {
    setWalletAddress(walletAddr);
  }, [walletAddr]);

  // Route protection
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
