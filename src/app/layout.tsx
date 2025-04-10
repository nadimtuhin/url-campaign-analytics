import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link"; // Import Link component
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
  // Update title and description
  title: "URL Shortener Pro",
  description: "Shorten URLs, manage campaigns, and track clicks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100`} // Add background
      >
        {/* Simple Header Navigation */}
        <header className="bg-white shadow-sm sticky top-0 z-50"> {/* Make header sticky */}
          <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex-shrink-0">
                <Link href="/" className="text-xl font-bold text-indigo-600">
                  Shortener Pro
                </Link>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <Link href="/" className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                    Shorten URL
                  </Link>
                  <Link href="/campaigns" className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                    Campaigns
                  </Link>
                  {/* Removed Analytics link */}
                </div>
              </div>
              {/* Mobile menu button could be added here */}
            </div>
          </nav>
        </header>

        {/* Page Content - Remove default container/padding here, apply in individual pages */}
        {children}

        {/* Optional Footer */}
        {/* <footer className="text-center py-4 text-gray-500 text-sm mt-auto">
          © {new Date().getFullYear()} Shortener Pro
        </footer> */}
      </body>
    </html>
  );
}
