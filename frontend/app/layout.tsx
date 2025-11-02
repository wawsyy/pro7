import type { Metadata } from "next";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Encrypted Lucky Draw",
  description: "Privacy-first lucky draw powered by Zama FHEVM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="relative min-h-screen bg-slate-950 text-white antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.2),_transparent_60%)]" />
        <Providers>
          <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-24 pt-10 md:px-8">
            <nav className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-6 py-4 shadow-lg backdrop-blur">
              <div className="flex items-center gap-3">
                <Image
                  src="/lucky-draw-logo.svg"
                  alt="Encrypted Lucky Draw logo"
                  width={48}
                  height={48}
                  priority
                />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-200/80">
                    Encrypted Operations
                  </p>
                  <p className="text-lg font-semibold text-white">Encrypted Lucky Draw</p>
                </div>
              </div>
              <ConnectButton
                accountStatus="address"
                chainStatus="icon"
                showBalance={false}
              />
            </nav>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
