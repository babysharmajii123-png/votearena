"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EditArena({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const currentSlug = resolvedParams.slug;

  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Arena State
  const [contestId, setContestId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [championBadgeId, setChampionBadgeId] = useState("");
  const [availableBadges, setAvailableBadges] = useState<any[]>([]);

  // Options State
  const [options, setOptions] = useState<any[]>([]);
  const [newOptionName, setNewOptionName] = useState(""); // Changed to Name

  useEffect(() => {
    fetchContestData();
    fetchBadges();
  }, [currentSlug]);

  const fetchContestData = async () => {
    const { data: contestData, error } = await supabase
      .from("contests")
      .select("*")
      .eq("slug", currentSlug)
      .single();

    if (error) {
      alert("Failed to load arena: " + error.message);
      setIsLoading(false);
      return;
    }

    if (contestData) {
      setContestId(contestData.id);
      setTitle(contestData.title);
      setDescription(contestData.description || "");
      setSlug(contestData.slug);
      
      const formattedDate = new Date(contestData.ends_at).toISOString().slice(0, 16);
      setEndsAt(formattedDate);
      setChampionBadgeId(contestData.champion_badge_id || "");

      const { data: optionsData } = await supabase
        .from("options")
        .select("*")
        .eq("contest_id", contestData.id)
        .order("created_at", { ascending: true });
      
      if (optionsData) setOptions(optionsData);
    }
    setIsLoading(false);
  };

  const fetchBadges = async () => {
    const { data } = await supabase.from("badges").select("*");
    if (data) setAvailableBadges(data);
  };

  const handleUpdateArena = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    const updateDate = new Date(endsAt);
    if (isNaN(updateDate.getTime())) {
      alert("Invalid date format.");
      setIsUpdating(false);
      return;
    }

    const { error } = await supabase
      .from("contests")
      .update({
        title,
        description,
        slug,
        ends_at: updateDate.toISOString(),
        champion_badge_id: championBadgeId || null
      })
      .eq("id", contestId);

    setIsUpdating(false);

    if (error) {
      alert("DB ERROR (Update): " + error.message);
    } else {
      alert("Arena successfully modified!");
      if (slug !== currentSlug) {
        router.push(`/admin/contests/${slug}`); 
      }
    }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionName.trim() || !contestId) return;

    // MATCHED DATABASE COLUMN 'name'
    const { data, error } = await supabase
      .from("options")
      .insert([{ contest_id: contestId, name: newOptionName }]) 
      .select();

    if (error) {
      alert("DB ERROR (Add Option): " + error.message);
    } else if (data) {
      setOptions([...options, data[0]]);
      setNewOptionName("");
    }
  };

  const handleDeclareWinner = async (optionId: string, optionName: string) => {
    const confirmWinner = confirm(`Are you sure you want to declare "${optionName}" as the official winner?`);
    if (!confirmWinner) return;

    await supabase.from("options").update({ is_winner: false }).eq("contest_id", contestId);
    
    const { error } = await supabase.from("options").update({ is_winner: true }).eq("id", optionId);

    if (error) {
      alert("DB ERROR (Declare Winner): " + error.message);
    } else {
      alert(`${optionName} has been crowned the winner!`);
      fetchContestData(); 
    }
  };

  if (isLoading) return <div className="p-8 text-white">Loading Arena...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">Edit Arena</h1>
          <p className="text-gray-400">Modify details or declare the winner.</p>
        </div>
        <Link href="/admin/contests" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors">
          ← Back to Arenas
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: EDIT DETAILS */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-4">Arena Settings</h2>
          <form onSubmit={handleUpdateArena} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Arena Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-rose-500 outline-none" required />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">URL Slug</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-rose-500 outline-none" required />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-rose-400">Prize Badge</label>
              <select value={championBadgeId} onChange={(e) => setChampionBadgeId(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-rose-500 outline-none appearance-none">
                <option value="">No Badge Selected</option>
                {availableBadges.map((badge) => (
                  <option key={badge.id} value={badge.id}>{badge.icon} {badge.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Deadline</label>
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-rose-500 outline-none" required />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-rose-500 outline-none h-24 resize-none" />
            </div>
            
            <button type="submit" disabled={isUpdating} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-rose-500/20">
              {isUpdating ? "Modifying..." : "Modify Arena"}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: OPTIONS & WINNER SELECTION */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-4">Voting Options & Winners</h2>
            
            <div className="space-y-3 mb-6">
              {options.length === 0 ? (
                <p className="text-gray-500 text-sm">No options added yet.</p>
              ) : (
                options.map((opt) => (
                  <div key={opt.id} className={`flex justify-between items-center p-4 rounded-xl border ${opt.is_winner ? 'bg-amber-500/20 border-amber-500/50' : 'bg-black/40 border-white/5'}`}>
                    <span className={`font-bold ${opt.is_winner ? 'text-amber-400' : 'text-white'}`}>
                      {/* USING opt.name HERE */}
                      {opt.name} {opt.is_winner && " 👑 (Winner)"}
                    </span>
                    
                    {!opt.is_winner && (
                      <button 
                        onClick={() => handleDeclareWinner(opt.id, opt.name)}
                        className="text-xs font-bold px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded transition-colors"
                      >
                        Crown Winner
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddOption} className="flex gap-2">
              <input 
                type="text" 
                value={newOptionName} 
                onChange={(e) => setNewOptionName(e.target.value)} 
                placeholder="e.g. 👑 King Kohli" 
                className="flex-1 bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-rose-500 outline-none" 
              />
              <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-rose-500/20">
                Add
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}