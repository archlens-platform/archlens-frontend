import type { Metadata } from "next";
import { Nunito, Fira_Code } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { SignalRProvider } from "@/providers/signalr-provider";
import { Navbar } from "@/components/navbar";
import { CookieBanner } from "@/components/cookie-banner";
import { PageTransition } from "@/components/page-transition";
import { AIChatWidget } from "@/components/ai-chat-widget";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const firaCode = Fira_Code({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ArchLens",
    template: "%s | ArchLens",
  },
  description: "AI-powered architecture diagram analysis with multi-provider consensus engine",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunito.className} ${firaCode.variable} antialiased`}>
        <ThemeProvider>
          <QueryProvider>
            <SignalRProvider>
              <TooltipProvider>
                <Navbar />
                <main className="mx-auto max-w-7xl px-4 py-6"><PageTransition>{children}</PageTransition></main>
                <CookieBanner />
                <AIChatWidget />
                <Toaster richColors position="bottom-right" toastOptions={{ duration: 3000 }} visibleToasts={1} />
              </TooltipProvider>
            </SignalRProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
