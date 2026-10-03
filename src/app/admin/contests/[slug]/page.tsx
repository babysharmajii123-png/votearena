"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";

export default function AdminArenaControl() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const supabase = createClient();

  const [contest, setContest] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newOptionName, setNewOptionName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchArenaData();
  }, [slug]);

  const fetchArenaData = async () => {
    setIsLoading(true);
    
    // Fetch Contest
    const { data: contestData } = await supabase
      .from("contests")
      .select("*")
      .eq("slug", slug)
      .single();

    if (contestData) {
      setContest(contestData);
      
      // Fetch Options
      const { data: optionsData } = await supabase
        .from("options")
        .select("*")
        .eq("contest_id", contestData.id)
        .order("created_at", { ascending: true });
        
      if (optionsData) setOptions(optionsData);

      // Fetch Votes for Progress Bars
      const { data: votesData } = await supabase
        .from("votes")
        .select("option_id")
        .eq("contest_id", contestData.id);
        
      if (votesData) setVotes(votesData);
    }
    
    setIsLoading(false);
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionName.trim()) return;
    setIsAdding(true);

    const { data, error } = await supabase
      .from("options")
      .insert([{ contest_id: contest.id, name: newOptionName }])
      .select();

    if (error) alert(`Error: ${error.message}`);
    else if (data) {
      setOptions([...options, data[0]]);
      setNewOptionName("");
    }
    setIsAdding(false);
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!confirm("Delete this option? This will also delete its votes.")) return;
    await supabase.from("options").delete().eq("id", optionId);
    setOptions(options.filter(opt => opt.id !== optionId));
    setVotes(votes.filter(vote => vote.option_id !== optionId));
  };

  const handleDeleteArena = async () => {
    if (!confirm("DANGER: Delete this entire Arena and all data?")) return;
    await supabase.from("contests").delete().eq("id", contest.id);
    router.push("/admin/contests");
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div></div>;
  if (!contest) return <div className="p-8 text-center text-white">Arena not found.</div>;

  const totalVotes = votes.length;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header Info */}
      <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">{contest.title}</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full font-bold">
              Live Arena
            </span>
            <span className="text-gray-400">/{contest.slug}</span>
            <span className="text-gray-400">• {totalVotes} Total Votes</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/contests" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors">
            Back
          </Link>
          <button onClick={handleDeleteArena} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg font-bold transition-colors">
            Delete Arena
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6">Manage Voting Options & Live Progress</h2>
        
        {/* Progress Bars & Options */}
        <div className="space-y-6 mb-8">
          {options.length > 0 ? (
            options.map((option) => {
              const optionVotes = votes.filter(v => v.option_id === option.id).length;
              const percentage = totalVotes === 0 ? 0 : Math.round((optionVotes / totalVotes) * 100);

              return (
                <div key={option.id} className="bg-black/50 border border-white/10 p-5 rounded-xl relative overflow-hidden group">
                  {/* Progress Bar Background */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-rose-500/20 to-orange-500/20 transition-all duration-1000 z-0" 
                    style={{ width: `${percentage}%` }}
                  ></div>

                  <div className="relative z-10 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <span className="font-black text-2xl text-white">{option.name}</span>
                      <span className="text-sm font-bold text-gray-400 bg-black/50 px-3 py-1 rounded-full">
                        {percentage}% ({optionVotes} votes)
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDeleteOption(option.id)}
                      className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 px-3 py-1 rounded-md text-sm font-bold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500 bg-black/30 rounded-xl border border-white/5">
              No options created yet.
            </div>
          )}
        </div>

        {/* Add New Option */}
        <form onSubmit={handleAddOption} className="flex gap-4">
          <input 
            type="text"
            value={newOptionName}
            onChange={(e) => setNewOptionName(e.target.value)}
            placeholder="New option title (e.g. Next.js)"
            className="flex-1 bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
            required
          />
          <button type="submit" disabled={isAdding} className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">
            {isAdding ? "Adding..." : "+ Add Option"}
          </button>
        </form>
      </div>
    </div>
  );
}