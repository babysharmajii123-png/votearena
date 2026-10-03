"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client"; // Adjust path if needed
import Link from "next/link";

export default function BadgeForge() {
  const [badges, setBadges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🏆");
  const [type, setType] = useState("Achievement");

  const supabase = createClient();

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("badges")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setBadges(data);
    setIsLoading(false);
  };

  const handleForgeBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data, error } = await supabase
      .from("badges")
      .insert([{ name, description, icon, type }])
      .select();

    if (error) {
      alert("Error forging badge: " + error.message);
    } else if (data) {
      setBadges([data[0], ...badges]);
      setName("");
      setDescription("");
      setIcon("🏆");
      setType("Achievement");
    }
    
    setIsSubmitting(false);
  };

  const handleDeleteBadge = async (id: string, badgeName: string) => {
    const confirmDelete = confirm(`Are you sure you want to shatter the "${badgeName}" badge? This will remove it from all users who earned it.`);
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("badges")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Failed to delete badge: " + error.message);
    } else {
      fetchBadges();
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">Badge<span className="text-rose-500">Forge</span></h1>
          <p className="text-gray-400">Design and mint new trophies for your voters.</p>
        </div>
        <Link href="/admin/contests" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors">
          ← Back to Arenas
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* THE ANVIL (Creation Form) */}
        <div className="lg:col-span-1">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sticky top-24">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">The Anvil</h2>
            
            <form onSubmit={handleForgeBadge} className="space-y-5">
              <div className="flex space-x-4">
                <div className="w-1/3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Icon</label>
                  <input 
                    type="text" 
                    value={icon} 
                    onChange={(e) => setIcon(e.target.value)} 
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-2xl text-center focus:outline-none focus:border-rose-500" 
                    required 
                    maxLength={2}
                  />
                </div>
                <div className="w-2/3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Badge Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500" 
                    placeholder="e.g. Early Adopter" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Rarity / Type</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500 appearance-none"
                >
                  <option value="Achievement">Achievement (Standard)</option>
                  <option value="Champion">Champion (Winner Only)</option>
                  <option value="Legendary">Legendary (Rare Event)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500 h-24 resize-none" 
                  placeholder="How is this badge earned?" 
                  required
                />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-rose-500/20">
                {isSubmitting ? "Forging..." : "Forge Badge"}
              </button>
            </form>
          </div>
        </div>

        {/* THE ARMORY (Grid of Existing Badges) */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4 flex justify-between items-center">
              <span>The Armory</span>
              <span className="bg-white/10 text-white text-xs px-3 py-1 rounded-full">{badges.length} Forged</span>
            </h2>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
              </div>
            ) : badges.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {badges.map((badge) => (
                  <div key={badge.id} className="relative group bg-black/40 border border-white/10 rounded-xl p-4 flex items-start space-x-4 hover:border-white/30 transition-colors">
                    <div className="text-4xl drop-shadow-lg">{badge.icon}</div>
                    <div className="flex-grow">
                      <h3 className="text-lg font-bold text-white leading-tight">{badge.name}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1">{badge.type}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{badge.description}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteBadge(badge.id, badge.name)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity p-2"
                      title="Shatter Badge"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 border border-white/5 border-dashed rounded-xl">
                <span className="text-4xl mb-4 block opacity-50">🔨</span>
                <p className="text-gray-500">Your armory is empty. Start forging!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}