import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { CacheSyncProvider, GlobalSyncIndicator } from "@/components/providers/cache-sync-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eventky - Calendar & Events",
  description: "Your social calendar and event management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <QueryProvider>
          <AuthProvider>
            <CacheSyncProvider>
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <SidebarTrigger className="m-4" />
                  {children}
                </SidebarInset>
              </SidebarProvider>
              <GlobalSyncIndicator />
              <Toaster />
            </CacheSyncProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
