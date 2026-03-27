"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { GlobeLogo } from "@/components/GlobeLogo";
import Aurora from "@/components/Aurora";
import { AtlasLoader } from "@/components/AtlasLoader";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/pipeline");
    }
  };

  if (loading) {
    return <AtlasLoader />;
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#050505]">
      {/* Background Aurora */}
      <div className="absolute inset-0 pointer-events-none opacity-50 select-none">
        <Aurora
          colorStops={["#00a3d7", "#b51a00", "#b92d5d"]}
          blend={0.5}
          amplitude={1.1}
          speed={0.8}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-panel p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-cyan-500/20 blur-[50px] rounded-full point-events-none" />

          <div className="flex flex-col items-center mb-8 relative z-20">
            <GlobeLogo />
            <h1 className="mt-4 text-2xl font-bold bg-gradient-to-r from-cyan-300 to-cyan-500 bg-clip-text text-transparent">
              Create Account
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Join AtlasOps and orchestrate AI systems.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4 relative z-20">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5 ml-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-zinc-600"
                placeholder="commander@atlasops.ai"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5 ml-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-zinc-600"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-red-400 text-sm py-2 px-3 bg-red-500/10 rounded-lg border border-red-500/20"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full relative group overflow-hidden rounded-xl font-bold text-black disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-emerald-400 transition-transform duration-300 group-hover:scale-105" />
              <div className="relative px-6 py-3.5 flex items-center justify-center gap-2">
                {loading ? "Creating System Link..." : "Initialize Access"}
              </div>
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500 relative z-20">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
