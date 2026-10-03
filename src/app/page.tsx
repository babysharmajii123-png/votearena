"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client"; // Fixed import path

export default function HomePage() {
  const [liveArenas, setLiveArenas] = useState<any[]>([]);
  const [pastArenas, setPastArenas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchArenas();
  }, []);

  const fetchArenas = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("contests")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const now = new Date();
      
      // Fixed TypeScript implicitly 'any' errors by adding ': any'
      const live = data.filter((arena: any) => new Date(arena.ends_at) > now);
      const past = data.filter((arena: any) => new Date(arena.ends_at) <= now);
      
      setLiveArenas(live);
      setPastArenas(past);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center pt-20 pb-12 px-6">
      
      {/* Hero Section */}
      <div className="w-full max-w-4xl text-center mb-20">
        <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-white/5 border border-white/10 text-rose-400 font-bold text-xs uppercase tracking-widest">
          Welcome to VoteArena
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">
          Predict. Vote. <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">Win.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Join real-time competitive voting arenas. Make your predictions, watch the live leaderboard, and earn exclusive badges for your trophy cabinet.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-rose-500 border-b-2"></div>
        </div>
      ) : (
        <div className="w-full max-w-5xl space-y-20">
          
          {/* Live Arenas Section */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-white flex items-center">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse mr-3"></span>
                Live Arenas
              </h2>
              <span className="text-gray-500 font-bold">{liveArenas.length} Active</span>
            </div>

            {liveArenas.length === 0 ? (
              <div className="p-12 text-center border border-white/10 border-dashed rounded-3xl bg-white/5">
                <p className="text-gray-400">No live arenas right now. Check back later!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveArenas.map((arena) => (
                  <Link href={`/contest/${arena.slug}`} key={arena.id}>
                    <div className="group bg-white/5 border border-white/10 hover:border-rose-500/50 rounded-3xl p-6 h-full flex flex-col transition-all duration-300 hover:bg-white/10 hover:-translate-y-1">
                      <div className="flex-grow">
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-rose-400 transition-colors">{arena.title}</h3>
                        <p className="text-sm text-gray-400 line-clamp-3">{arena.description}</p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Voting Open</span>
                        <span className="text-gray-500 text-sm group-hover:text-white transition-colors">Join →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Past Arenas Section */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-white opacity-80">
                Past Results
              </h2>
            </div>

            {pastArenas.length === 0 ? (
              <div className="p-12 text-center border border-white/5 rounded-3xl bg-black/40">
                <p className="text-gray-600">No past arenas yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70">
                {pastArenas.map((arena) => (
                  <Link href={`/contest/${arena.slug}`} key={arena.id}>
                    <div className="bg-black/40 border border-white/5 hover:border-white/20 rounded-3xl p-6 h-full flex flex-col transition-all duration-300 grayscale hover:grayscale-0">
                      <div className="flex-grow">
                        <h3 className="text-lg font-bold text-gray-300 mb-2">{arena.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">{arena.description}</p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Concluded</span>
                        <span className="text-gray-500 text-sm">View Winners →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
          
        </div>
      )}
    </div>
  );
}