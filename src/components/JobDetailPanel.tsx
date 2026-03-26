"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Job } from '../store/JobContext';
import { X, Terminal, Box } from 'lucide-react';

export function JobDetailPanel({ job, onClose }: { job: Job | null; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <AnimatePresence>
      {job && (
        <motion.div
          initial={{ x: 520, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 520, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 bottom-0 w-[520px] bg-white dark:bg-[#0c0c0e] border-l border-slate-200 dark:border-[#27272a]/60 z-50 flex flex-col shadow-2xl dark:shadow-black/80"
        >
          {/* Header */}
          <div className="h-[72px] border-b border-slate-200 dark:border-[#27272a]/40 flex items-center justify-between px-6 bg-slate-50 dark:bg-[#0f0f12] shrink-0">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] text-indigo-700 dark:text-zinc-400 bg-indigo-50 dark:bg-white/5 px-2 py-0.5 rounded border border-indigo-200 dark:border-white/10 tracking-widest uppercase shadow-sm dark:shadow-none">
                {job.id}
              </span>
              <h2 className="font-medium text-[15px] text-slate-900 dark:text-zinc-100">{job.topic}</h2>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-[#18181b] transition-colors border border-transparent dark:hover:border-zinc-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub Nav Tabs */}
          <div className="flex border-b border-slate-200 dark:border-[#27272a]/40 px-6 gap-6 pt-5 bg-white dark:bg-[#0f0f12] shrink-0">
            {['Overview', 'Compliance', 'Channels', 'Localization'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-[11px] font-mono uppercase tracking-widest border-b-2 transition-all font-medium
                  ${activeTab === tab ? 'border-indigo-600 text-indigo-700 dark:border-zinc-300 dark:text-zinc-200' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-400'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar">
             {activeTab === 'Overview' && (
               <div className="space-y-6">
                 <div className="bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#27272a]/60 rounded-2xl p-6 ring-1 ring-inset ring-transparent dark:ring-white/5 shadow-sm dark:shadow-none">
                   <h3 className="text-[10px] font-mono text-indigo-600 dark:text-zinc-500 mb-4 uppercase tracking-widest font-semibold flex items-center gap-2">
                     <Box className="w-3.5 h-3.5" /> Output Buffer
                   </h3>
                   <div className="font-sans text-[13px] text-slate-700 dark:text-zinc-300 leading-relaxed space-y-4 font-normal">
                     <p>We are pleased to announce our Q3 results, showcasing strong continued growth across all major sectors.</p>
                     <p>Our commitment to operational excellence has delivered a 15% margin improvement over previously stated estimates.</p>
                   </div>
                 </div>
               </div>
             )}

             {activeTab === 'Compliance' && (
               <div className="space-y-4">
                 <div className="bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 p-5 rounded-2xl text-[12px] font-mono leading-relaxed ring-1 ring-inset ring-transparent dark:ring-rose-500/10 shadow-sm">
                   <span className="text-rose-600 dark:text-rose-400 block mb-2 font-bold">- 15% margin improvement</span>
                   <span className="text-emerald-700 dark:text-emerald-400 block mb-3 font-bold">+ 15% estimated margin improvement</span>
                   <span className="text-[10px] text-rose-500/80 dark:text-rose-400/80 block mt-2 border-t border-rose-200 dark:border-rose-500/20 pt-3">
                     // Policy violation: Forward-looking statements must contain the word "estimated"
                   </span>
                 </div>
               </div>
             )}
             
             {/* Stub tabs */}
             {activeTab !== 'Overview' && activeTab !== 'Compliance' && (
               <div className="flex items-center justify-center h-full text-slate-400 dark:text-zinc-600 font-mono text-xs uppercase tracking-widest">
                 Module Inactive
               </div>
             )}
          </div>

          {/* Thinking Stream Terminal */}
          <div className="h-[280px] border-t border-slate-200 dark:border-[#27272a]/60 bg-slate-50 dark:bg-[#0f0f12] flex flex-col shrink-0">
            <div className="h-10 border-b border-slate-200 dark:border-[#27272a]/40 flex items-center px-6 bg-white dark:bg-[#141417] gap-2.5 shrink-0">
              <Terminal className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-semibold">Live Telemetry</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2.5 font-mono text-[11px] bg-transparent custom-scrollbar">
              {job.agentLogs?.length === 0 ? (
                <div className="text-slate-400 dark:text-zinc-600 flex items-center justify-center h-full text-[10px] uppercase tracking-widest">Awaiting execution...</div>
              ) : (
                (job.agentLogs || []).map((log, i) => (
                  <div key={i} className="flex gap-4 p-1 hover:bg-slate-100 dark:hover:bg-[#18181b]/50 rounded transition-colors group">
                    <span className="text-slate-400 dark:text-zinc-600 shrink-0 w-[50px]">{new Date(log.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    <span className={`w-[90px] shrink-0 tracking-wider font-semibold ${log.agent === 'System' ? 'text-slate-500 dark:text-zinc-500' : 'text-indigo-600 dark:text-zinc-300'}`}>{log.agent}</span>
                    <span className="text-slate-600 dark:text-zinc-400 leading-relaxed group-hover:text-slate-900 dark:group-hover:text-zinc-200 transition-colors">{log.message}</span>
                  </div>
                ))
              )}
              <div className="flex mt-1 p-1">
                <span className="w-1.5 h-3.5 bg-indigo-500 dark:bg-zinc-500 inline-block animate-pulse" />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
