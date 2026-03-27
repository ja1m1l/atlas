"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sun, Moon, User, Plus, LogOut, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobeLogo } from './GlobeLogo';
import { NewJobModal } from './NewJobModal';
import Aurora from './Aurora';
import { useAuth } from '../store/AuthContext';
import { AtlasLoader } from './AtlasLoader';

const TABS = [
  { id: 'PIPELINE', label: 'PIPELINE', href: '/pipeline' },
  { id: 'AGENTS', label: 'AGENTS', href: '/agents' },
  { id: 'ANALYTICS', label: 'ANALYTICS', href: '/analytics' },
  { id: 'RULES', label: 'RULES', href: '/rules' },
  { id: 'AUDIT', label: 'AUDIT', href: '/audit' },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const activeTab = TABS.find(tab => pathname.startsWith(tab.href))?.id || 'PIPELINE';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <AtlasLoader />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans overflow-hidden flex flex-col items-center p-2 sm:p-6 relative ${isDarkMode ? 'text-[#e4e4e7]' : 'text-slate-900'}`}>
      
      {/* Background Layers */}
      <div className={`fixed inset-0 transition-colors duration-300 ${isDarkMode ? 'bg-[#050505]' : 'bg-slate-100'}`} />
      
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-60 select-none overflow-hidden">
        <Aurora
          colorStops={["#00a3d7","#b51a00","#b92d5d"]}
          blend={0.5}
          amplitude={1.1}
          speed={0.8}
        />
      </div>

      <header className="flex w-full items-center justify-between px-4 pb-6 max-w-[1440px] pt-4 sm:pt-0 relative z-20">
        <div className="flex items-center gap-1.5">
          <GlobeLogo />
          <div className="flex flex-col justify-center relative">
            <span className="font-black leading-none tracking-wider text-[16px] italic pr-2 flex items-center gap-2 bg-gradient-to-r from-cyan-300 via-teal-400 to-cyan-500 bg-clip-text text-transparent">
              ATLASOPS
            </span>
            <span className="text-cyan-600 dark:text-cyan-400/70 font-mono text-[8px] tracking-[0.25em] uppercase font-bold mt-0.5">
              Intelligent Systems
            </span>
            {/* Rocket trail underline */}
            <svg
              className="absolute -bottom-1.5 left-0 w-full h-[6px] overflow-visible"
              viewBox="0 0 120 6"
              fill="none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="rocketTrail" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="20%" stopColor="#06b6d4" stopOpacity="0.15" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.6" />
                  <stop offset="85%" stopColor="#22d3ee" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#67e8f9" stopOpacity="1" />
                </linearGradient>
                <filter id="trailGlow">
                  <feGaussianBlur stdDeviation="1" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d="M0,3 Q30,5 60,3 T120,2.5"
                stroke="url(#rocketTrail)"
                strokeWidth="1.5"
                strokeLinecap="round"
                filter="url(#trailGlow)"
              />
              {/* Bright tip particle */}
              <circle cx="118" cy="2.5" r="1.5" fill="#67e8f9" opacity="0.9">
                <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="118" cy="2.5" r="3" fill="#22d3ee" opacity="0.2">
                <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
        </div>
        
        <nav className="hidden lg:flex items-center bg-white shadow-sm dark:shadow-none dark:bg-white/5 p-1.5 rounded-full border border-slate-200 dark:border-white/10 relative">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`relative px-6 py-2.5 text-[11px] font-mono uppercase tracking-widest rounded-full transition-colors z-10 font-semibold
                  ${isActive ? 'text-indigo-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300'}
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-highlight"
                    className="absolute inset-0 bg-indigo-50 dark:bg-[#18181b] rounded-full border border-indigo-100 dark:border-[#27272a] shadow-sm dark:shadow-md"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-20">{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-white dark:bg-[#0c0c0e] border-t border-slate-200 dark:border-white/10 px-2 py-2 shadow-lg">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`relative px-3 py-2 text-[9px] font-mono uppercase tracking-widest rounded-lg transition-colors z-10 font-semibold
                  ${isActive ? 'text-indigo-700 dark:text-white bg-indigo-50 dark:bg-white/10' : 'text-slate-500 dark:text-zinc-500'}
                `}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 text-[11px] font-mono uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-colors mr-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-200 dark:border-emerald-500/20 shadow-sm dark:shadow-none"
          >
            <Plus className="w-3.5 h-3.5" /> New Mission
          </button>
          
          <div className="flex items-center gap-4 border-l border-slate-200 dark:border-white/10 pl-6">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="text-slate-500 dark:text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="relative ml-2">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                title="Profile"
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors shadow-sm overflow-hidden ${
                  isProfileOpen 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-400' 
                    : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                <User className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-3 w-56 rounded-xl bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden z-50 origin-top-right"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5">
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 truncate">
                        {user.email}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-zinc-500 truncate mt-0.5">
                        Commander
                      </p>
                    </div>
                    
                    <div className="p-1.5">
                      <button 
                        onClick={() => {
                          setIsProfileOpen(false);
                          // Optional: Add settings navigation later
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-zinc-200 rounded-lg transition-colors text-left font-medium"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                    </div>

                    <div className="p-1.5 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                      <button 
                        onClick={async () => {
                          setIsProfileOpen(false);
                          await signOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-left font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Click away dismiss layer */}
              {isProfileOpen && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsProfileOpen(false)} 
                />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 max-w-[1440px] bg-white dark:bg-[#0c0c0e]/80 backdrop-blur-3xl rounded-3xl border border-slate-200 dark:border-[#27272a]/40 shadow-xl dark:shadow-2xl overflow-hidden ring-1 ring-inset ring-slate-100 dark:ring-white/5 flex flex-col relative z-10 h-[calc(100vh-8rem)] transition-colors duration-300">
        <div className="flex-1 relative overflow-hidden flex flex-col bg-transparent">
          {children}
        </div>
      </main>
      
      {isModalOpen && <NewJobModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
