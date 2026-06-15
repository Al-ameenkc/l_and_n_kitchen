import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: "L&N Kitchen Menu",
  description: "Swipe through the L&N Kitchen menu — An Oasis of Pleasure",
  applicationName: "L&N Kitchen Menu",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full`}>
      <body className="h-full overflow-hidden bg-[#111111] font-sans text-white antialiased">
        {children}
      </body>
    </html>
  );
}
