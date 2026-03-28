"use client";

import React, { useState } from 'react';
import { useAuth } from '../../../store/AuthContext';
import { 
  User, 
  Save, 
  Mail,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabase';

export default function SettingsPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (error) throw error;
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Update profile error:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar">
      <div className="max-w-2xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">Account Settings</h1>
          <p className="text-slate-500 dark:text-zinc-500 font-mono text-xs uppercase tracking-widest">
            Manage your personal profile and preferences
          </p>
        </header>

        <div className="space-y-8">
          {/* Profile Section */}
          <section className="bg-white dark:bg-[#141417]/40 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Profile Information
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                    Full Display Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Commander Shepard"
                    className="w-full bg-slate-50 dark:bg-black/20 text-[14px] text-slate-900 dark:text-zinc-200 rounded-xl px-4 py-3 border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-400 dark:focus:border-zinc-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3 w-full bg-slate-100/50 dark:bg-black/40 text-[14px] text-slate-500 dark:text-zinc-500 rounded-xl px-4 py-3 border border-slate-200 dark:border-white/5 cursor-not-allowed">
                    <Mail className="w-4 h-4 opacity-50" />
                    {user?.email}
                    <span className="ml-auto text-[9px] bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter">Verified</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {saveStatus === 'success' && (
                      <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Changes saved
                      </motion.span>
                    )}
                    {saveStatus === 'error' && (
                      <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Failed to save
                      </motion.span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSaving || fullName === (user?.user_metadata?.full_name || '')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white dark:bg-white dark:text-black rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
