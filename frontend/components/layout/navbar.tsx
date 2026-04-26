"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { truncateAddress, cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/constants";
import { useEffect, useState } from "react";

// Dynamic import to avoid SSR hydration mismatch
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export function Navbar() {
  const { publicKey, disconnect, connected } = useWallet();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Only render wallet-dependent UI after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-surface-1 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
          <span>🛡️</span>
          <span>Killswitch</span>
        </Link>

        {/* Center nav links — visible when wallet connected */}
        {mounted && connected && (
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Right side — wallet */}
        <div className="flex items-center gap-4">
          {!mounted ? (
            // Placeholder while mounting to prevent layout shift
            <div className="h-9 w-32 animate-pulse rounded-md bg-surface-2" />
          ) : connected && publicKey ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground font-mono">
                {truncateAddress(publicKey.toBase58())}
              </span>
              <button
                onClick={() => disconnect()}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <WalletMultiButton className="!bg-primary !text-primary-foreground !rounded-md !h-9 !px-4 !text-sm !font-medium hover:!opacity-90" />
          )}
        </div>
      </div>
    </nav>
  );
}
