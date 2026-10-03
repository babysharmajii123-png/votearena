import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { contestId } = await req.json();
    console.log(`🏆 Starting reward calculation for Arena: ${contestId}`);

    // Fetch contest configuration
    const { data: contest, error: contestError } = await supabase
      .from("contests")
      .select("champion_badge_id, rewards_distributed, ends_at")
      .eq("id", contestId)
      .single();

    if (contestError || !contest) return NextResponse.json({ error: "Contest not found" });

    if (!contest.champion_badge_id) {
      console.log("⚠️ No champion badge assigned to this arena. Skipping.");
      return NextResponse.json({ message: "No champion badge assigned." });
    }

    if (contest.rewards_distributed) {
      console.log("⚠️ Rewards already distributed.");
      return NextResponse.json({ message: "Already distributed." });
    }

    // Fetch options to check if admin declared a winner manually
    const { data: optionsData } = await supabase
      .from("options")
      .select("id, is_winner")
      .eq("contest_id", contestId);
      
    const validOptionIds = optionsData?.map(o => o.id) || [];

    // Fetch votes (including voter_token and user_id)
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("voter_token, user_id, option_id")
      .eq("contest_id", contestId);

    if (votesError || !votes || votes.length === 0) {
      await supabase.from("contests").update({ rewards_distributed: true }).eq("id", contestId);
      return NextResponse.json({ message: "No votes cast." });
    }

    // Filter out votes cast for deleted options
    const validVotes = votes.filter((v: any) => validOptionIds.includes(v.option_id));

    if (validVotes.length === 0) {
      await supabase.from("contests").update({ rewards_distributed: true }).eq("id", contestId);
      return NextResponse.json({ message: "No valid votes remaining." });
    }

    // Determine Winner: Check for Admin Override (is_winner === true) first, else fallback to max votes
    const adminDeclaredWinner = optionsData?.find((o: any) => o.is_winner === true);
    let winningOptionId = adminDeclaredWinner?.id;

    if (!winningOptionId) {
      const voteCounts = validVotes.reduce((acc: any, vote: any) => {
        acc[vote.option_id] = (acc[vote.option_id] || 0) + 1;
        return acc;
      }, {});

      winningOptionId = Object.keys(voteCounts).reduce((a, b) => 
        voteCounts[a] > voteCounts[b] ? a : b
      );
    }

    console.log(`✅ Official Winning Option ID: ${winningOptionId}`);

    // Map winners and include both voter_token AND user_id
    const winningVoters = validVotes
      .filter((v: any) => String(v.option_id) === String(winningOptionId))
      .map((v: any) => ({
        voter_token: v.voter_token,
        anonymous_session_id: v.voter_token, 
        user_id: v.user_id || null,
        badge_id: contest.champion_badge_id, 
        contest_id: contestId,
        option_id: winningOptionId
      }));

    if (winningVoters.length > 0) {
      const { error: insertError } = await supabase.from("badge_awards").insert(winningVoters);
      if (insertError) {
        if (insertError.code === '23505') {
          console.log("🛡️ Badges already minted by a concurrent request. Safe to ignore.");
          await supabase.from("contests").update({ rewards_distributed: true }).eq("id", contestId);
          return NextResponse.json({ success: true, message: "Already handled." });
        }
        
        console.error("❌ MINTING ERROR:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }
    
    await supabase.from("contests").update({ rewards_distributed: true }).eq("id", contestId);
    console.log(`🎉 SUCCESS! Minted ${winningVoters.length} Champion Badges.`);
    
    return NextResponse.json({ success: true, awardedCount: winningVoters.length });

  } catch (error) {
    console.error("❌ CRITICAL ERROR:", error);
    return NextResponse.json({ error: "Failed to distribute rewards" }, { status: 500 });
  }
}