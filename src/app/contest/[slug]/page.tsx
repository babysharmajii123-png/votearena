"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

export default function PublicArena() {
  const params = useParams();
  const slug = params?.slug as string;
  const supabase = createClient();

  // Contest State
  const [contest, setContest] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnded, setIsEnded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Voting & Real-time State
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);

  useEffect(() => {
    if (slug) {
      sessionStorage.setItem("tab_active_arena", slug);
    }
    fetchArenaData();
  }, [slug]);

  const fetchArenaData = async () => {
    // 1. Fetch Contest
    const { data: contestData } = await supabase
      .from("contests")
      .select("*")
      .eq("slug", slug)
      .single();

    if (!contestData) {
      setIsLoading(false);
      return;
    }

    setContest(contestData);
    
    // Check if time limit has passed immediately
    if (contestData.ends_at && new Date() > new Date(contestData.ends_at)) {
      setIsEnded(true);
      
      if (!contestData.rewards_distributed) {
        contestData.rewards_distributed = true;
        
        fetch("/api/rewards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contestId: contestData.id })
        }).then((res) => {
          if (res.ok) {
            setTimeout(() => fetchArenaData(), 1500);
          } else {
            console.error("Reward distribution API failed.");
          }
        });
      }
    }

    // 2. Fetch Options
    const { data: optionsData } = await supabase
      .from("options")
      .select("*")
      .eq("contest_id", contestData.id);
      
    if (optionsData) setOptions(optionsData);

    // 3. Fetch Initial Vote Counts
    const { data: votesData } = await supabase
      .from("votes")
      .select("option_id")
      .eq("contest_id", contestData.id);

    if (votesData) {
      const initialCounts: Record<string, number> = {};
      votesData.forEach((vote: any) => {
        initialCounts[vote.option_id] = (initialCounts[vote.option_id] || 0) + 1;
      });
      setCounts(initialCounts);
      setTotalVotes(votesData.length);
    }

    // 4. Check if user has already voted
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;
    const token = localStorage.getItem("voter_token");

    let existingVote = null;

    if (currentUser) {
      const { data: userVote } = await supabase
        .from("votes")
        .select("option_id")
        .eq("contest_id", contestData.id)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      existingVote = userVote;
    }

    const localVotedOption = localStorage.getItem(`voted_${contestData.id}`);

    if (existingVote) {
      setHasVoted(true);
      setSelectedId(existingVote.option_id);
      localStorage.setItem(`voted_${contestData.id}`, existingVote.option_id);
    } else if (localVotedOption) {
      setHasVoted(true);
      setSelectedId(localVotedOption);
    } else {
      setHasVoted(false);
      setSelectedId(null);
    }

    // Fetch earned badges for this user/token
    if (currentUser || token) {
      let badgeQuery = supabase
        .from("badge_awards")
        .select("badges(*)")
        .eq("contest_id", contestData.id);

      if (currentUser) {
        badgeQuery = badgeQuery.eq("user_id", currentUser.id);
      } else if (token) {
        badgeQuery = badgeQuery.eq("voter_token", token);
      }

      const { data: badgeData } = await badgeQuery;
      if (badgeData) {
        setEarnedBadges(badgeData.map((b: any) => b.badges));
      }
    }

    setIsLoading(false);
  };

  // Countdown Timer Logic
  useEffect(() => {
    if (!contest?.ends_at || isEnded) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(contest.ends_at).getTime();
      const distance = end - now;

      if (distance <= 0) {
        setIsEnded(true);
        setTimeLeft("00:00:00");
        
        fetch("/api/rewards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contestId: contest.id })
        }).then((res) => {
          if (res.ok) setTimeout(() => fetchArenaData(), 1500);
        });

        return true;
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setTimeLeft(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
        return false;
      }
    };

    const timeIsUp = updateTimer();
    if (timeIsUp) return;

    const timer = setInterval(() => {
      const done = updateTimer();
      if (done) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [contest, isEnded]);

  // Subscribe to Real-Time Updates
  useEffect(() => {
    if (!contest) return;

    const channel = supabase
      .channel("live_votes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "votes", filter: `contest_id=eq.${contest.id}` },
        () => fetchArenaData()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "votes", filter: `contest_id=eq.${contest.id}` },
        () => fetchArenaData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contest, supabase]);

  const handleSelect = (optionId: string) => {
    if (hasVoted || isEnded) return;
    setSelectedId(optionId);
  };

  const handleSubmitVote = async () => {
    if (hasVoted || !selectedId || isEnded || !contest) return;
    setIsSubmitting(true);

    let token = localStorage.getItem("voter_token");
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem("voter_token", token);
    }

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    const { error } = await supabase.from("votes").insert([
      { contest_id: contest.id, option_id: selectedId, voter_token: token, user_id: userId },
    ]);

    if (error) {
      if (error.code === '23505') {
        alert("You have already voted in this arena!");
        setHasVoted(true);
      } else {
        alert("Vote Error: " + error.message);
      }
      setIsSubmitting(false);
      return;
    }

    // Award Participation Badge
    const { data: badgeDataArray } = await supabase
      .from("badges")
      .select("*")
      .eq("name", "Arena Initiated")
      .limit(1);

    const badgeData = badgeDataArray?.[0];

    if (badgeData) {
      await supabase.from("badge_awards").insert([{
        voter_token: token,
        anonymous_session_id: token,
        user_id: userId,
        badge_id: badgeData.id,
        contest_id: contest.id,
        option_id: selectedId
      }]);
    }

    setHasVoted(true);
    localStorage.setItem(`voted_${contest.id}`, selectedId);
    setIsSubmitting(false);
    fetchArenaData();
  };

  // REMOVE / UNDO VOTE LOGIC
  const handleRemoveVote = async () => {
    if (!hasVoted || isEnded || !contest) return;
    setIsSubmitting(true);

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;
    const token = localStorage.getItem("voter_token");

    let query = supabase.from("votes").delete().eq("contest_id", contest.id);

    if (currentUser) {
      query = query.eq("user_id", currentUser.id);
    } else if (token) {
      query = query.eq("voter_token", token);
    } else {
      setIsSubmitting(false);
      return;
    }

    const { error } = await query;

    if (error) {
      alert("Failed to remove vote: " + error.message);
      setIsSubmitting(false);
      return;
    }

    // Clear local cache & reset component state
    localStorage.removeItem(`voted_${contest.id}`);
    setHasVoted(false);
    setSelectedId(null);
    setIsSubmitting(false);

    // Refresh arena state
    fetchArenaData();
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-rose-500 border-b-2"></div></div>;
  if (!contest) return <div className="text-white text-center mt-20">Arena not found.</div>;

  const declaredWinnerOption = options.find((o) => o.is_winner === true);
  const maxVotes = Math.max(...Object.values(counts), 0);

  return (
    <div className="flex flex-col space-y-6 w-full max-w-xl mx-auto pb-12 pt-8 px-4">
      
      <div className="text-center mb-4">
        <h1 className="text-4xl font-black text-white mb-2">{contest.title}</h1>
        <p className="text-gray-400">{contest.description}</p>
        
        {isEnded ? (
          <div className="mt-6 inline-block px-6 py-2 bg-rose-500/20 border border-rose-500 text-rose-400 font-bold text-sm uppercase tracking-widest rounded-full animate-pulse">
            Arena Concluded
          </div>
        ) : (
          timeLeft && (
            <div className="mt-6 inline-flex items-center space-x-2 px-6 py-2 bg-white/5 border border-white/10 text-white font-mono font-bold text-lg rounded-full shadow-lg">
              <span className="text-gray-400 text-sm tracking-widest uppercase font-sans mr-2">Ends In:</span>
              <span>⏱ {timeLeft}</span>
            </div>
          )
        )}
      </div>
      
      {/* Voting Options */}
      <div className="flex flex-col space-y-4">
        {options?.map((option) => {
          const isSelected = selectedId === option.id;
          const optionCount = counts[option.id] || 0;
          const percentage = totalVotes > 0 ? Math.round((optionCount / totalVotes) * 100) : 0;
          
          const isWinner = isEnded && (declaredWinnerOption ? declaredWinnerOption.id === option.id : optionCount === maxVotes && optionCount > 0);
          const isLoser = isEnded && !isWinner;
          const isIncorrectPick = isLoser && isSelected;
          
          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={hasVoted || isEnded}
              className={`group relative overflow-hidden p-5 rounded-2xl flex items-center space-x-4 transition-all duration-500 text-left border z-10
                ${isWinner ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-400 scale-105 shadow-[0_0_30px_rgba(250,204,21,0.2)]' : 'bg-white/5'}
                ${isIncorrectPick ? 'border-red-500/50 bg-red-500/10' : (isLoser ? 'border-white/5 opacity-50 grayscale' : '')}
                ${!isEnded && isSelected ? 'border-rose-500 bg-white/10 ring-1 ring-rose-500/50' : ''}
                ${!isEnded && !isSelected ? 'border-white/10' : ''}
                ${!hasVoted && !isEnded ? 'hover:bg-white/10 hover:border-rose-500/50 active:scale-95' : 'cursor-default'}
              `}
            >
              {/* Progress Bar Background */}
              {(hasVoted || isEnded) && !isWinner && !isIncorrectPick && !isLoser && (
                <div 
                  className={`absolute top-0 left-0 h-full -z-10 transition-all duration-1000 ease-out opacity-20
                    ${isSelected ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-white/20'}
                  `}
                  style={{ width: `${percentage}%` }}
                />
              )}

              {/* Circle Icon / Winner Crown */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors
                ${isWinner ? 'bg-yellow-500/20 border-yellow-400 text-2xl animate-bounce' : ''}
                ${isIncorrectPick ? 'bg-red-500/20 border-red-500/50 text-xl' : ''}
                ${!isWinner && !isIncorrectPick && isSelected ? 'bg-gradient-to-br from-rose-500 to-orange-500 border-rose-400' : ''}
                ${!isWinner && !isIncorrectPick && !isSelected ? 'bg-gradient-to-br from-gray-700 to-gray-900 border-white/5' : ''}
                ${!hasVoted && !isEnded ? 'group-hover:from-rose-500 group-hover:to-orange-500' : ''}
              `}>
                <span className="text-xl font-bold text-white">
                  {isWinner ? "👑" : (isIncorrectPick ? "❌" : (hasVoted && isSelected ? "✓" : option.name.charAt(0)))}
                </span>
              </div>
              
              <div className="flex-grow flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-bold transition-colors 
                    ${isWinner ? 'text-yellow-400' : (isIncorrectPick ? 'text-red-400' : (isSelected && !isEnded ? 'text-rose-400' : 'text-white'))}
                  `}>
                    {option.name}
                  </h3>
                  {isWinner && <p className="text-xs text-yellow-500 font-bold uppercase tracking-widest mt-1 animate-pulse">Champion</p>}
                  {isIncorrectPick && <p className="text-xs text-red-400 font-bold uppercase tracking-widest mt-1">Incorrect Prediction</p>}
                  {isLoser && !isIncorrectPick && <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Better luck next time</p>}
                  {(hasVoted || isEnded) && !isWinner && !isLoser && !isIncorrectPick && (
                    <p className="text-sm text-gray-300 font-medium mt-0.5">{optionCount} votes</p>
                  )}
                </div>

                {(hasVoted || isEnded) && (
                  <div className={`text-2xl font-black 
                    ${isWinner ? 'text-yellow-400' : (isIncorrectPick ? 'text-red-400' : (isSelected && !isEnded ? 'text-rose-400' : 'text-gray-400'))}
                  `}>
                    {percentage}%
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      {!hasVoted && !isEnded && (
        <button
          onClick={handleSubmitVote}
          disabled={!selectedId || isSubmitting}
          className={`py-4 rounded-xl font-bold text-lg transition-all duration-300 mt-4
            ${!selectedId 
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
              : 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg hover:shadow-rose-500/25 active:scale-95'}
          `}
        >
          {isSubmitting ? "Submitting..." : "Submit Vote"}
        </button>
      )}

      {hasVoted && !isEnded && (
        <button
          onClick={handleRemoveVote}
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl font-bold text-sm text-rose-400 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 transition-all mt-2"
        >
          {isSubmitting ? "Processing..." : "🔄 Undo / Remove My Vote"}
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