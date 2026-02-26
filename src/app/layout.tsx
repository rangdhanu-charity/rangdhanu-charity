import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CookieConsent } from "@/components/common/cookie-consent";
import { ThemeProvider } from "@/components/common/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { DataProvider } from "@/lib/data-context";
import { NotificationProvider } from "@/lib/notification-context";
import { MessageProvider } from "@/lib/message-context";
import { Toaster } from "@/components/ui/toaster";
import { SessionTimeout } from "@/components/common/session-timeout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rangdhanu Charity Foundation",
  description: "Supporting underprivileged children, especially helping them continue their education.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col font-sans`}
      >
        <AuthProvider>
          <NotificationProvider>
            <MessageProvider>
              <DataProvider>
                <SessionTimeout />
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                  disableTransitionOnChange
                >
                  <Navbar />
                  <main className="flex-1">
                    {children}
                  </main>
                  <Footer />
                  <CookieConsent />
                  <Toaster />
                </ThemeProvider>
              </DataProvider>
            </MessageProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
