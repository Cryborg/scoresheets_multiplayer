import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./theme.css";
import "./utilities.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import ToastProviderReactHot from "@/components/providers/ToastProvider";
import MaintenanceCheck from "@/components/MaintenanceCheck";
import { BRANDING } from "@/lib/branding";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BRANDING.fullTitle,
  description: BRANDING.description.full,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
        suppressHydrationWarning
        data-hydrated="true"
      >
        <AuthProvider>
          <ToastProvider>
            <ToastProviderReactHot />
            <MaintenanceCheck>
              {children}
            </MaintenanceCheck>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}