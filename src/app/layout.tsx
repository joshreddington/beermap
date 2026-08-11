import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CrawlProvider } from "@/context/CrawlContext";
import { HomeProvider } from "@/context/HomeContext";
import { CustomLocationsProvider } from "@/context/CustomLocationsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { VisitedYearProvider } from "@/context/VisitedYearContext";
import { AuthProvider } from "@/context/AuthContext";
import { GeoLocationProvider } from "@/context/GeoLocationContext";
import { LocationSharingProvider } from "@/context/LocationSharingContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Munich Bar Crawl",
  description: "Map beer houses in Munich and log your own bar crawl.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#171717",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col overscroll-none">
        <ThemeProvider>
          <HomeProvider>
            <CustomLocationsProvider>
              <VisitedYearProvider>
                <AuthProvider>
                  <GeoLocationProvider>
                    <LocationSharingProvider>
                      <CrawlProvider>{children}</CrawlProvider>
                    </LocationSharingProvider>
                  </GeoLocationProvider>
                </AuthProvider>
              </VisitedYearProvider>
            </CustomLocationsProvider>
          </HomeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
