import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { BackgroundEffects } from "@/components/BackgroundEffects";
import { AIAssistant } from "@/components/AIAssistant";
import { CriticalAlertBanner } from "@/components/CriticalAlertBanner";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gallifrey | Advanced Structural Health Monitoring",
  description: "Advanced SHM platform for bridge infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <body className={`${outfit.className} overflow-hidden`}>
        <BackgroundEffects />
        <div className="flex h-screen w-screen bg-transparent text-foreground selection:bg-primary/30 relative z-10">
          <Sidebar />
          <main className="flex-1 md:ml-64 overflow-y-auto overflow-x-hidden scroll-hide relative pt-16 md:pt-0">
            {/* Background Grain/Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            
            <div className="p-8 max-w-[1600px] mx-auto min-h-full flex flex-col relative z-10">
              <CriticalAlertBanner />
              {children}
            </div>
            
            <footer className="mt-auto p-8 border-t border-white/5 text-center">
              <p className="text-xs text-muted-foreground tracking-widest uppercase">
                Gallifrey SHM Framework © 2026 // Distributed Sensing Network
              </p>
            </footer>
          </main>
        </div>
        <AIAssistant />
      </body>
    </html>
  );
}
