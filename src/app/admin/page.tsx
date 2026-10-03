"use client";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-black mb-8 text-white">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Linked Manage Arenas Card */}
        <Link href="/admin/contests">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-rose-500/50 transition-colors cursor-pointer h-full">
            <h2 className="text-xl font-bold mb-2">⚔️ Manage Arenas</h2>
            <p className="text-gray-400 text-sm">Create new contests, update existing ones, or end live polls.</p>
          </div>
        </Link>

        {/* Linked Badge Forge Card */}
        <Link href="/admin/badges">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-orange-500/50 transition-colors cursor-pointer h-full">
            <h2 className="text-xl font-bold mb-2">🏆 Badge Forge</h2>
            <p className="text-gray-400 text-sm">Design new achievements and assign them to active arenas.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}