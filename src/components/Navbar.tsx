"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client"; 

export default function Navbar() {
  const pathname = usePathname();
  const [arenaLink, setArenaLink] = useState("/contest/loading"); 

  useEffect(() => {
    const syncArenaLink = async () => {
      // 1. IF YOU ARE IN AN ARENA: Lock the link to this URL and save it to THIS TAB'S memory
      if (pathname?.startsWith("/contest/")) {
        setArenaLink(pathname);
        const currentSlug = pathname.replace("/contest/", "");
        sessionStorage.setItem("tab_active_arena", currentSlug);
        return;
      }

      // 2. IF YOU ARE ON PROFILE/HOME: Read THIS TAB'S specific memory
      const tabArena = sessionStorage.getItem("tab_active_arena");
      if (tabArena) {
        setArenaLink(`/contest/${tabArena}`);
        return;
      }

      // 3. IF NO MEMORY EXISTS IN THIS TAB: Fetch the newest arena from the database
      const supabase = createClient();
      const { data } = await supabase
        .from("contests")
        .select("slug")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setArenaLink(`/contest/${data.slug}`);
      }
    };

    syncArenaLink();
  }, [pathname]);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <nav className="w-full border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <span className="text-2xl group-hover:rotate-12 transition-transform duration-300">⚔️</span>
          <span className="font-black text-xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">
            VoteArena
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex space-x-1 bg-white/5 p-1 rounded-full border border-white/10">
          <Link 
            href="/" 
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
              pathname === "/" 
                ? "bg-white/10 text-white shadow-sm" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Home
          </Link>
          <Link 
            href={arenaLink} 
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
              pathname?.includes("/contest") 
                ? "bg-white/10 text-white shadow-sm" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Live Arena
          </Link>
          <Link 
            href="/profile" 
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
              pathname === "/profile" 
                ? "bg-white/10 text-white shadow-sm" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            My Trophies
          </Link>
        </div>

      </div>
    </nav>
  );
}