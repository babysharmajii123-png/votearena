"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";

export default function VotingClient({ 
  contestId, 
  options 
}: { 
  contestId: string; 
  options: any[]; 
}) {
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Real-time & Badge states
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
  
  const supabase = createClient();

  // 1. Initial Load: Check local storage, fetch counts, and fetch badges
  useEffect(() => {
    const token = localStorage.getItem("voter_token");
    const votedOption = localStorage.getItem(`voted_${contestId}`);
    
    if (votedOption) {
      setHasVoted(true);
      setSelectedId(votedOption);
      
      // Fetch user's badges if they have a token
      if (token) {
        const fetchBadges = async () => {
          const { data } = await supabase
            .from("badge_awards")
            .select("badges(*)")
            .eq("voter_token", token)
            .eq("contest_id", contestId);
            
          if (data) {
            setEarnedBadges(data.map((b: any) => b.badges));
          }
        };
        fetchBadges();
      }
    }

    const fetchInitialCounts = async () => {
      const { data } = await supabase
        .from("votes")
        .select("option_id")
        .eq("contest_id", contestId);
      
      if (data) {
        const initialCounts: Record<string, number> = {};
        data.forEach(vote => {
          initialCounts[vote.option_id] = (initialCounts[vote.option_id] || 0) + 1;
        });
        setCounts(initialCounts);
        setTotalVotes(data.length);
      }
    };

    fetchInitialCounts();
  }, [contestId, supabase]);

  // 2. Subscribe to Real-Time Updates
  useEffect(() => {
    const channel = supabase
      .channel("live_votes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "votes", filter: `contest_id=eq.${contestId}` },
        (payload) => {
          const newVoteOptionId = payload.new.option_id;
          setCounts((prev) => ({
            ...prev,
            [newVoteOptionId]: (prev[newVoteOptionId] || 0) + 1,
          }));
          setTotalVotes((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contestId, supabase]);

  const handleSelect = (optionId: string) => {
    if (hasVoted) return;
    setSelectedId(optionId);
  };

  const handleSubmitVote = async () => {
    if (hasVoted || !selectedId) return;
    setIsSubmitting(true);

    let token = localStorage.getItem("voter_token");
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem("voter_token", token);
    }

    // 1. Insert the vote
    const { error } = await supabase.from("votes").insert([
      { contest_id: contestId, option_id: selectedId, voter_token: token },
    ]);

    if (error) {
      console.error("Error casting vote:", error.message);
      if (error.code === '23505') {
        alert("Wait! The database says this token already voted. Badge step skipped.");
        setHasVoted(true);
      } else {
        alert("Vote Error: " + error.message);
      }
      setIsSubmitting(false);
      return;
    }

    // 2. Award "Arena Initiated" Badge (Grabbing just the first one if duplicates exist)
    const { data: badgeDataArray, error: badgeError } = await supabase
      .from("badges")
      .select("*")
      .eq("name", "Arena Initiated")
      .limit(1);

    if (badgeError) {
      alert("Badge Fetch Error: " + badgeError.message);
    }

    const badgeData = badgeDataArray?.[0];

    if (badgeData) {
      const { error: insertError } = await supabase.from("badge_awards").insert([{
        voter_token: token,
        anonymous_session_id: token, 
        badge_id: badgeData.id,
        contest_id: contestId,
        option_id: selectedId // <-- ADD THIS LINE
      }]);
      
      if (insertError) {
        alert("Badge Award Error: " + insertError.message);
      } else {
        setEarnedBadges([badgeData]); // Update UI instantly
      }
    }

    setHasVoted(true);
    localStorage.setItem(`voted_${contestId}`, selectedId);
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col space-y-6 w-full max-w-sm mx-auto pb-12">
      
      {/* Voting Options */}
      <div className="flex flex-col space-y-4">
        {options?.map((option) => {
          const isSelected = selectedId === option.id;
          const optionCount = counts[option.id] || 0;
          const percentage = totalVotes > 0 ? Math.round((optionCount / totalVotes) * 100) : 0;
          
          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={hasVoted}
              className={`group relative overflow-hidden bg-white/5 p-5 rounded-2xl flex items-center space-x-4 transition-all duration-300 text-left border z-10
                ${isSelected ? 'border-rose-500 bg-white/10 ring-1 ring-rose-500/50' : 'border-white/10'}
                ${!hasVoted ? 'hover:bg-white/10 hover:border-rose-500/50 active:scale-95' : 'cursor-default opacity-90'}
              `}
            >
              {hasVoted && (
                <div 
                  className={`absolute top-0 left-0 h-full -z-10 transition-all duration-1000 ease-out opacity-20
                    ${isSelected ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-white/20'}
                  `}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors
                ${isSelected ? 'bg-gradient-to-br from-rose-500 to-orange-500 border-rose-400' : 'bg-gradient-to-br from-gray-700 to-gray-900 border-white/5'}
                ${!hasVoted && 'group-hover:from-rose-500 group-hover:to-orange-500'}
              `}>
                <span className="text-xl font-bold text-white">
                  {hasVoted && isSelected ? "✓" : option.name.charAt(0)}
                </span>
              </div>
              
              <div className="flex-grow flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-bold transition-colors ${isSelected ? 'text-rose-400' : 'text-white'}`}>
                    {option.name}
                  </h3>
                  {!hasVoted && option.description && (
                    <p className="text-sm text-gray-400 line-clamp-1">{option.description}</p>
                  )}
                  {hasVoted && (
                    <p className="text-sm text-gray-300 font-medium mt-0.5">{optionCount} votes</p>
                  )}
                </div>

                {hasVoted && (
                  <div className={`text-2xl font-black ${isSelected ? 'text-rose-400' : 'text-gray-400'}`}>
                    {percentage}%
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Submit Button */}
      {!hasVoted && (
        <button
          onClick={handleSubmitVote}
          disabled={!selectedId || isSubmitting}
          className={`py-4 rounded-xl font-bold text-lg transition-all duration-300
            ${!selectedId 
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
              : 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg hover:shadow-rose-500/25 active:scale-95'}
          `}
        >
          {isSubmitting ? "Submitting..." : "Submit Vote"}
        </button>
      )}

      {/* Badges Display Section */}
      {hasVoted && earnedBadges.length > 0 && (
        <div className="mt-8 p-6 bg-white/5 border border-rose-500/20 rounded-2xl text-center">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Badges Earned</h4>
          <div className="flex justify-center flex-wrap gap-6">
            {earnedBadges.map(badge => (
              <div key={badge.id} className="flex flex-col items-center group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform cursor-help" title={badge.description}>
                  {badge.icon}
                </div>
                <p className="text-sm font-bold text-rose-400">{badge.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}