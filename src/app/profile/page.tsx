"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import Link from "next/link";

export default function ProfilePage() {
  const [awards, setAwards] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Avatar Selection State
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    checkUserAndFetchTrophies();
  }, []);

  const checkUserAndFetchTrophies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoading(false);
      return;
    }

    setUser(user);

    const { data } = await supabase
      .from("badge_awards")
      .select(`
        id,
        awarded_at,
        badges (*),
        contests (title, slug)
      `)
      .eq("user_id", user.id)
      .order("awarded_at", { ascending: false });

    if (data) setAwards(data);
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAwards([]);
  };

  const changeAvatar = async (url: string) => {
    setIsUpdating(true);
    
    // Save the new avatar directly to the user's Supabase metadata
    const { data, error } = await supabase.auth.updateUser({
      data: { custom_avatar: url }
    });

    if (error) {
      alert("Failed to update avatar: " + error.message);
    } else if (data.user) {
      setUser(data.user); // Update local state immediately
      setIsEditingAvatar(false);
    }
    
    setIsUpdating(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-rose-500 border-b-2"></div>
      </div>
    );
  }

  // 1. Generate a unique, permanent default avatar based on their User ID
  const defaultUniqueAvatar = user ? `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}` : "";
  
  // 2. Determine which avatar to show: Custom Choice > Default Unique Avatar (Ignores Google by default)
  const currentAvatar = user?.user_metadata?.custom_avatar || defaultUniqueAvatar;

  // 3. Generate 6 different styles based on their User ID for the selection menu
  const avatarStyles = ["bottts", "adventurer", "micah", "fun-emoji", "pixel-art", "avataaars"];
  const personalizedOptions = user ? avatarStyles.map(style => `https://api.dicebear.com/7.x/${style}/svg?seed=${user.id}`) : [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 min-h-screen">
      {/* HEADER SECTION */}
      <div className="mb-12 flex flex-col items-center text-center">
        {user ? (
          <div className="flex flex-col items-center space-y-4">
            
            {/* AVATAR DISPLAY (Clickable) */}
            <div 
              onClick={() => setIsEditingAvatar(!isEditingAvatar)}
              className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl group cursor-pointer transition-all hover:border-rose-500 hover:scale-105"
            >
              <img 
                src={currentAvatar} 
                alt="Profile" 
                className="object-cover w-full h-full bg-white/5"
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-bold uppercase tracking-widest">Change</span>
              </div>
            </div>

            <div>
              <h1 className="text-4xl font-black text-white">{user.user_metadata.full_name || "Arena Champion"}</h1>
              <p className="text-gray-400">{user.email}</p>
            </div>
            
            <button 
              onClick={handleSignOut}
              className="text-sm font-bold text-gray-500 hover:text-rose-400 transition-colors"
            >
              Sign Out
            </button>

            {/* AVATAR SELECTION MENU */}
            {isEditingAvatar && (
              <div className="mt-6 p-6 bg-white/5 border border-white/10 rounded-2xl w-full max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Select Your Avatar</h3>
                <div className="grid grid-cols-3 gap-4">
                  
                  {/* Map through their personalized unique options */}
                  {personalizedOptions.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => changeAvatar(url)}
                      disabled={isUpdating}
                      className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all
                        ${currentAvatar === url ? 'border-rose-500 bg-rose-500/10 scale-105' : 'border-white/5 bg-black/50 hover:border-white/20 hover:scale-105'}
                      `}
                    >
                      <img src={url} alt={`Option ${idx}`} className="w-full h-full p-2" />
                    </button>
                  ))}
                  
                  {/* They can still explicitly choose their Google Photo if they want to */}
                  {user.user_metadata?.avatar_url && (
                    <button
                      onClick={() => changeAvatar(user.user_metadata.avatar_url)}
                      disabled={isUpdating}
                      className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all flex flex-col items-center justify-center
                        ${currentAvatar === user.user_metadata.avatar_url ? 'border-rose-500 bg-rose-500/10 scale-105' : 'border-white/5 bg-black/50 hover:border-white/20 hover:scale-105'}
                      `}
                    >
                      <img src={user.user_metadata.avatar_url} className="w-10 h-10 rounded-full mb-1" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Google</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Player Profile</h1>
            <p className="text-gray-400">Sign in to save your trophies permanently.</p>
          </div>
        )}
      </div>

      {/* CONTENT SECTION (Trophy Cabinet) */}
      {!user ? (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl max-w-2xl mx-auto backdrop-blur-sm">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-2">Secure Your Legacy</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Log in with Google to ensure your badges are saved forever across all your devices.
          </p>
          <button 
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition-colors mx-auto shadow-xl shadow-white/10"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
            Sign in with Google
          </button>
        </div>
      ) : awards.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
          <div className="text-6xl mb-4 opacity-50">🏆</div>
          <h2 className="text-2xl font-bold text-white mb-2">Your cabinet is empty</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            You haven't earned any badges yet. Head over to an active arena, cast your vote, and start building your legacy!
          </p>
          <Link href="/" className="px-8 py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity">
            Find an Arena
          </Link>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">Trophy Cabinet</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {awards.map((award) => {
              const badge = award.badges;
              const contest = award.contests;
              const dateEarned = new Date(award.awarded_at).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric'
              });

              return (
                <div key={award.id} className="group relative bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center overflow-hidden hover:border-amber-500/50 hover:bg-white/10 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative text-7xl mb-4 group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl">
                    {badge.icon}
                  </div>
                  <h3 className="relative text-xl font-bold text-white mb-1">{badge.name}</h3>
                  <p className="relative text-xs text-amber-400 font-bold uppercase tracking-wider mb-4">
                    {badge.type || "Achievement"}
                  </p>
                  <p className="relative text-sm text-gray-400 mb-6 flex-grow">{badge.description}</p>
                  <div className="relative w-full pt-4 border-t border-white/10 flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">Earned {dateEarned}</span>
                    {contest && (
                      <Link href={`/contest/${contest.slug}`} className="text-xs font-bold text-white/70 hover:text-white transition-colors truncate max-w-full">
                        in {contest.title}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}