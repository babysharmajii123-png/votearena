"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client"; // Adjust path if needed
import Link from "next/link";
import ArenaQR from "@/components/ArenaQR"; // IMPORTED HERE!

// Helper function to format exactly 24 hours from now for the datetime-local input
const getDefaultDeadline = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
  return tomorrow.toISOString().slice(0, 16); 
};

export default function ManageArenas() {
  const [contests, setContests] = useState<any[]>([]);
  const [availableBadges, setAvailableBadges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [championBadgeId, setChampionBadgeId] = useState("");
  
  const [endsAt, setEndsAt] = useState(getDefaultDeadline()); 

  const supabase = createClient();

  useEffect(() => {
    fetchContests();
    fetchBadges();
  }, []);

  const fetchContests = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("contests")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setContests(data);
    setIsLoading(false);
  };

  const fetchBadges = async () => {
    const { data } = await supabase
      .from("badges")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setAvailableBadges(data);
  };

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const deadlineDate = new Date(endsAt);

    if (deadlineDate <= new Date()) {
      alert("The deadline must be set to a future time!");
      setIsSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("contests")
      .insert([{ 
        title, 
        description, 
        slug, 
        starts_at: new Date().toISOString(),
        ends_at: deadlineDate.toISOString(),
        champion_badge_id: championBadgeId || null
      }])
      .select();

    if (error) {
      alert(`REAL DB ERROR: ${error.message}`);
    } else if (data) {
      setContests([data[0], ...contests]);
      // Reset form
      setTitle("");
      setDescription("");
      setSlug("");
      setChampionBadgeId("");
      setEndsAt(getDefaultDeadline()); 
    }
    
    setIsSubmitting(false);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSlug(newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
  };

  const handleForceEnd = async (id: string, currentTitle: string) => {
    const confirmEnd = confirm(`Are you sure you want to end "${currentTitle}" right now? This cannot be undone.`);
    if (!confirmEnd) return;

    const { error } = await supabase
      .from("contests")
      .update({ ends_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      alert("Error ending contest: " + error.message);
    } else {
      fetchContests(); 
    }
  };

  const handleDeleteArena = async (id: string, currentTitle: string) => {
    const confirmDelete = confirm(`DANGER: Delete this entire Arena ("${currentTitle}") and all data?`);
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("contests")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Failed to delete from database: " + error.message);
    } else {
      fetchContests(); 
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">Manage Arenas</h1>
          <p className="text-gray-400">Create and oversee live voting contests.</p>
        </div>
        <Link href="/admin" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-4">Launch New Arena</h2>
            
            <form onSubmit={handleCreateContest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Arena Title</label>
                <input type="text" value={title} onChange={handleTitleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500" placeholder="e.g. Best Tech Stack" required />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">URL Slug</label>
                <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-gray-400 focus:outline-none" placeholder="best-tech-stack" required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-rose-400">Prize Badge (Optional)</label>
                <select 
                  value={championBadgeId} 
                  onChange={(e) => setChampionBadgeId(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500 appearance-none"
                >
                  <option value="">No Badge Selected</option>
                  {availableBadges.map((badge) => (
                    <option key={badge.id} value={badge.id}>
                      {badge.icon} {badge.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between">
                  <span>Deadline</span>
                  <button type="button" onClick={() => setEndsAt(getDefaultDeadline())} className="text-rose-400 hover:text-rose-300 transition-colors">Reset to 24h</button>
                </label>
                <input 
                  type="datetime-local" 
                  value={endsAt} 
                  onChange={(e) => setEndsAt(e.target.value)} 
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500 h-24 resize-none" placeholder="What are we voting on today?" />
              </div>
              
              <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-rose-500/20">
                {isSubmitting ? "Deploying..." : "Deploy Arena"}
              </button>
            </form>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-4 flex justify-between items-center">
              <span>Active Arenas</span>
              <span className="bg-white/10 text-white text-xs px-3 py-1 rounded-full">{contests.length} Total</span>
            </h2>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
              </div>
            ) : contests.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {contests.map((contest) => {
                  const isEnded = new Date(contest.ends_at) <= new Date();

                  return (
                    <div key={contest.id} className="bg-black/40 border border-white/10 rounded-xl p-5 flex flex-col md:flex-row items-center gap-6 hover:border-white/20 transition-colors">
                      {/* Left: QR Code (ADDED HERE) */}
                      <div className="flex-shrink-0">
                        <ArenaQR slug={contest.slug} title={contest.title} />
                      </div>

                      {/* Middle: Details */}
                      <div className="flex-1 text-center md:text-left space-y-2">
                        <h3 className="font-black text-xl text-white">{contest.title}</h3>
                        <p className="text-sm text-gray-400 line-clamp-2">{contest.description}</p>
                        <div className="flex items-center justify-center md:justify-start gap-2 pt-1">
                          <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">/{contest.slug}</span>
                          {isEnded ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">Ended</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Live</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col gap-2 min-w-[120px]">
                        <a href={`/contest/${contest.slug}`} target="_blank" rel="noreferrer" className="text-center text-xs font-bold px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors">
                          View Arena ↗
                        </a>
                        <Link href={`/admin/contests/${contest.slug}`} className="text-center text-xs font-bold px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded transition-colors">
                          Edit
                        </Link>
                        {!isEnded && (
                          <button
                            onClick={() => handleForceEnd(contest.id, contest.title)}
                            className="text-xs font-bold px-3 py-2 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                          >
                            Force End
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteArena(contest.id, contest.title)}
                          className="text-xs font-bold px-3 py-2 rounded bg-red-900/40 text-red-400 hover:bg-red-600/60 border border-red-500/30 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No arenas deployed yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}