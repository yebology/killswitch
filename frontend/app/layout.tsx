import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { WalletProvider } from "@/components/providers/wallet-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { LayoutShell } from "@/components/layout/layout-shell";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Killswitch — Real-Time DeFi Exploit Protection",
  description:
    "Real-time exploit detection and auto-pause system for Solana DeFi protocols.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <WalletProvider>
            <AuthProvider>
              <LayoutShell>{children}</LayoutShell>
            </AuthProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
