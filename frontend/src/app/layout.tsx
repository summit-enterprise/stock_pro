import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import GoogleProvider from "@/components/GoogleOAuthProvider";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import MainContentWrapper from "@/components/MainContentWrapper";
import Footer from "@/components/Footer";
import { SidebarProvider } from "@/contexts/SidebarContext";
import LayoutClient from "@/components/LayoutClient";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockPro - Stock Trading Platform",
  description: "Your comprehensive stock trading platform. Track markets, analyze trends, and make informed decisions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-gray-100 dark:bg-black">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100 dark:bg-black text-gray-900 dark:text-white transition-colors`}
      >
        {/* Always enable dark mode */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
        <GoogleProvider>
          <SidebarProvider>
            <LayoutClient>
              {children}
            </LayoutClient>
          </SidebarProvider>
        </GoogleProvider>
      </body>
    </html>
  );
}
