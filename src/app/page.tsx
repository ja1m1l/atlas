"use client";

import React, { useState, useEffect } from 'react';
import { useJobContext } from '../store/JobContext';
import { 
  Sun, Moon, User, Plus
} from 'lucide-react';
import { PipelineBoard } from '../components/views/PipelineBoard';
import { AgentConstellation } from '../components/views/AgentConstellation';
import { AnalyticsView } from '../components/views/AnalyticsView';
import { ComplianceRules } from '../components/views/ComplianceRules';
import { AuditTrail } from '../components/views/AuditTrail';
import { NewJobModal } from '../components/NewJobModal';
import { motion, AnimatePresence } from 'framer-motion';

import { GlobeLogo } from '../components/GlobeLogo';

export default function Dashboard() {
  const { state, dispatch } = useJobContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const TABS = [
    { id: 'PIPELINE', label: 'PIPELINE' },
    { id: 'AGENTS', label: 'AGENTS' },
    { id: 'ANALYTICS', label: 'ANALYTICS' },
    { id: 'RULES', label: 'RULES' },
    { id: 'AUDIT', label: 'AUDIT' },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans overflow-hidden flex flex-col items-center p-2 sm:p-6 ${isDarkMode ? 'bg-[#050505] text-[#e4e4e7]' : 'bg-slate-100 text-slate-900'}`}>
      
      <header className="flex w-full items-center justify-between px-4 pb-6 max-w-[1440px] pt-4 sm:pt-0">
        <div className="flex items-center gap-4">
          <GlobeLogo />
          <div className="flex flex-col justify-center">
            <span className="text-slate-900 dark:text-white font-black leading-none tracking-wider text-[16px] italic pr-2 flex items-center gap-2">
              ATLASOPS
            </span>
            <span className="text-indigo-600 dark:text-[#3b82f6] font-mono text-[8px] tracking-[0.25em] uppercase font-bold mt-0.5">
              Intelligent Systems
            </span>
          </div>
        </div>
        
        <nav className="hidden lg:flex items-center bg-white shadow-sm dark:shadow-none dark:bg-white/5 p-1.5 rounded-full border border-slate-200 dark:border-white/10 relative">
          {TABS.map((tab) => {
            const isActive = state.activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.id })}
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
              </button>
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
            <button className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm ml-2 overflow-hidden">
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 max-w-[1440px] bg-white dark:bg-[#0c0c0e]/80 backdrop-blur-3xl rounded-3xl border border-slate-200 dark:border-[#27272a]/40 shadow-xl dark:shadow-2xl overflow-hidden ring-1 ring-inset ring-slate-100 dark:ring-white/5 flex flex-col relative h-[calc(100vh-8rem)] transition-colors duration-300">
        <div className="flex-1 relative overflow-hidden flex flex-col bg-transparent">
          <AnimatePresence mode="wait">
            <motion.div 
              key={state.activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col"
            >
               {state.activeTab === 'PIPELINE' && <PipelineBoard />}
               {state.activeTab === 'AGENTS' && <AgentConstellation />}
               {state.activeTab === 'ANALYTICS' && <AnalyticsView />}
               {state.activeTab === 'RULES' && <ComplianceRules />}
               {state.activeTab === 'AUDIT' && <AuditTrail />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      
      {isModalOpen && <NewJobModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
