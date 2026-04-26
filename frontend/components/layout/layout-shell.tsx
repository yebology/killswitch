"use client";

import { Navbar } from "./navbar";

/** Layout shell — navbar only, no sidebar. Full-width content area. */
export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen">{children}</main>
    </>
  );
}
