"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client"; // Adjust path if needed
import Link from "next/link";

export default function MyTrophiesPage() {
  const [awards, setAwards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchTrophies();
  }, []);

  const fetchTrophies = async () => {
    // 1. Get the user's secret voting token
    const token = localStorage.getItem("voter_token");
    
    if (!token) {
      setIsLoading(false);
      setHasToken(false);
      return;
    }

    setHasToken(true);

    // 2. Fetch all badges awarded to this token, including badge details and arena names
    const { data, error } = await supabase
      .from("badge_awards")
      .select(`
        id,
        awarded_at,
        badges (*),
        contests (title, slug)
      `)
      .eq("voter_token", token)
      .order("awarded_at", { ascending: false });

    if (data) {
      setAwards(data);
    }
    
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-rose-500 border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4">My Trophies</h1>
        <p className="text-gray-400">A collection of your achievements and correct predictions.</p>
      </div>

      {!hasToken || awards.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
          <div className="text-6xl mb-4 opacity-50">🏆</div>
          <h2 className="text-2xl font-bold text-white mb-2">Your cabinet is empty</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            You haven't earned any badges yet. Head over to an active arena, cast your vote, and start building your legacy!
          </p>
          <Link 
            href="/"
            className="px-8 py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Find an Arena
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {awards.map((award) => {
            const badge = award.badges;
            const contest = award.contests;
            
            // Format the date securely
            const dateEarned = new Date(award.awarded_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div 
                key={award.id} 
                className="group relative bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center overflow-hidden hover:border-rose-500/50 hover:bg-white/10 transition-all duration-300"
              >
                {/* Background Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Badge Icon */}
                <div className="relative text-7xl mb-4 group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl">
                  {badge.icon}
                </div>
                
                {/* Badge Details */}
                <h3 className="relative text-xl font-bold text-white mb-1">{badge.name}</h3>
                <p className="relative text-xs text-rose-400 font-bold uppercase tracking-wider mb-4">
                  {badge.type || "Achievement"}
                </p>
                <p className="relative text-sm text-gray-400 mb-6 flex-grow">
                  {badge.description}
                </p>
                
                {/* Meta Information (Date & Arena) */}
                <div className="relative w-full pt-4 border-t border-white/10 flex flex-col items-center">
                  <span className="text-xs text-gray-500 mb-1">Earned {dateEarned}</span>
                  {contest && (
                    <Link 
                      href={`/contest/${contest.slug}`}
                      className="text-xs font-bold text-white/70 hover:text-white transition-colors truncate max-w-full"
                    >
                      in {contest.title}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}