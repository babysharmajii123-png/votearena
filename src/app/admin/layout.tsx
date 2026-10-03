"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      // Check for a real Supabase auth session, completely ignoring local voter_tokens
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && pathname !== "/admin/login") {
        // Not logged in? Kick them to the login screen
        router.push("/admin/login");
      } else if (session && pathname === "/admin/login") {
        // Already logged in? Send them to the dashboard
        router.push("/admin");
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* If we aren't on the login page, show an Admin Header */}
      {pathname !== "/admin/login" && (
        <header className="border-b border-white/10 bg-white/5 p-4 flex justify-between items-center">
          <div className="font-bold text-rose-500">Admin Control Center</div>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/admin/login");
            }}
            className="text-xs font-bold text-gray-400 hover:text-white"
          >
            Sign Out
          </button>
        </header>
      )}
      {children}
    </div>
  );
}