import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Space_Grotesk } from 'next/font/google';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'] // Include all weights you plan to use
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={spaceGrotesk.className}>
      <body>{children}</body>
    </html>
  );
}
