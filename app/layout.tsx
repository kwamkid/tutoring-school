import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: "--font-ibm-plex-sans-thai",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "ระบบจัดการโรงเรียนสอนพิเศษ",
  description: "ระบบจัดการโรงเรียนสอนพิเศษแบบครบวงจร",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${ibmPlexSansThai.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
