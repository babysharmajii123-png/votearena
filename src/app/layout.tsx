import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 1. Import your Navbar
import Navbar from "../components/Navbar"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VoteArena",
  description: "Real-time anonymous voting",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white min-h-screen`}>
        {/* 2. Place it above children so it shows on every page */}
        <Navbar /> 
        
        {/* 3. This is where your page content renders */}
        <main>{children}</main>
      </body>
    </html>
  );
}