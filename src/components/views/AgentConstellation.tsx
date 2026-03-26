"use client";

import React, { useMemo } from 'react';
import { useJobContext } from '../../store/JobContext';
import { Activity, Bot, Terminal, ShieldCheck, Globe, StopCircle, CheckCircle2, PlaySquare, Loader2, ServerCog, Workflow } from 'lucide-react';

const AGENTS = [
  { id: 'drafting', name: 'Drafting Protocol', role: 'Initial Generation', icon: <Bot className="w-5 h-5 text-indigo-500 dark:text-zinc-400" /> },
  { id: 'compliance', name: 'Compliance Engine', role: 'Rule Validation', icon: <ShieldCheck className="w-5 h-5 text-indigo-500 dark:text-zinc-400" /> },
  { id: 'localization', name: 'L10N Network', role: 'Translation Matrix', icon: <Globe className="w-5 h-5 text-indigo-500 dark:text-zinc-400" /> },
  { id: 'approval', name: 'Approval Gate', role: 'Human-in-Loop', icon: <CheckCircle2 className="w-5 h-5 text-indigo-500 dark:text-zinc-400" /> },
  { id: 'publishing', name: 'Deployment Auth', role: 'Content Push', icon: <PlaySquare className="w-5 h-5 text-indigo-500 dark:text-zinc-400" /> }
];

export function AgentConstellation() {
  const { state } = useJobContext();

  const allLogs = useMemo(() => {
    return state.jobs.flatMap(j => 
       (j.agentLogs || []).map(log => ({ ...log, jobId: j.id }))
    ).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [state.jobs]);

  return (
    <div className="p-8 h-full flex flex-col gap-8 w-full max-w-[1400px] mx-auto overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[1.3rem] font-medium text-slate-900 dark:text-white mb-1 tracking-tight flex items-center gap-2">
             <Workflow className="w-5 h-5 text-indigo-600 dark:text-zinc-500" /> Agent Constellation
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-zinc-500">Live virtualization of swarm nodes and concurrent processing threads.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {AGENTS.map((agent) => {
          const isActive = Math.random() > 0.3 || state.jobs.length > 0;
          return (
            <div key={agent.id} className="bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#27272a]/60 rounded-2xl p-5 group transition-all shadow-sm dark:shadow-none ring-1 ring-inset ring-transparent dark:ring-white/5 hover:border-indigo-200 dark:hover:border-zinc-600/50">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-slate-50 dark:bg-[#18181b] p-2.5 rounded-xl border border-slate-200 dark:border-[#27272a]/40 shadow-sm">
                  {agent.icon}
                </div>
                {isActive ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/20 uppercase tracking-widest shadow-sm dark:shadow-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_5px_#34d399]" /> BUSY
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 dark:text-zinc-500 bg-slate-100 dark:bg-[#18181b] px-2 py-0.5 rounded-full border border-slate-200 dark:border-[#27272a]/60 uppercase tracking-widest">
                    IDLE
                  </span>
                )}
              </div>
              
              <h3 className="font-medium text-[15px] text-slate-900 dark:text-zinc-100 mb-1">{agent.name}</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-500 tracking-wide uppercase font-mono mb-6">{agent.role}</p>

              <div className="mt-auto space-y-2 relative">
                <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                  <span>LOAD ACCUMULATION</span>
                  <span className={isActive ? 'text-indigo-600 dark:text-zinc-300' : ''}>{isActive ? Math.floor(Math.random() * 40 + 40) : 0}%</span>
                </div>
                {/* Hashed background bar */}
                <div className="w-full h-1.5 flex gap-[1px]">
                  {Array.from({length: 40}).map((_, i) => {
                    const threshold = isActive ? Math.floor(Math.random() * 40 + 40) : 0;
                    const isFilled = (i / 40) * 100 < threshold;
                    return (
                      <div 
                        key={i} 
                        className={`flex-1 h-full rounded-sm transition-colors ${isFilled ? 'bg-indigo-500 dark:bg-zinc-300/80 dark:shadow-[0_0_2px_rgba(255,255,255,0.2)]' : 'bg-slate-100 dark:bg-[#27272a]/60'}`} 
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#27272a]/60 rounded-2xl flex flex-col overflow-hidden shadow-sm dark:shadow-none ring-1 ring-inset ring-transparent dark:ring-white/5 relative">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-50 dark:bg-zinc-400/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="border-b border-slate-200 dark:border-[#27272a]/40 px-6 py-4 flex items-center justify-between bg-white/50 dark:bg-[#0f0f12]/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <ServerCog className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
            <h3 className="text-[13px] font-medium text-slate-700 dark:text-zinc-300 tracking-wide">Global Swarm Output</h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-slate-600 dark:text-zinc-400 flex items-center gap-2 border border-slate-200 dark:border-zinc-700/50 px-2 py-1 rounded bg-slate-50 dark:bg-[#18181b]">
               <Loader2 className="w-3 h-3 animate-spin text-slate-500 dark:text-zinc-500" /> SYSTEM ONLINE
            </span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 font-mono text-[13px] flex flex-col gap-2.5 bg-transparent z-10">
          {allLogs.length === 0 ? (
            <div className="text-slate-400 dark:text-zinc-600 flex items-center justify-center h-full">Awaiting telemetry streams...</div>
          ) : (
            allLogs.map((log, i) => (
              <div key={i} className="flex gap-4 p-1.5 hover:bg-slate-50 dark:hover:bg-[#18181b] rounded-lg transition-colors group">
                <span className="text-slate-400 dark:text-zinc-600 w-[90px] shrink-0">[{new Date(log.time).toLocaleTimeString([], {hour12:false})}]</span>
                <span className="text-indigo-600 dark:text-zinc-400 bg-indigo-50 dark:bg-white/5 px-1.5 rounded w-[70px] shrink-0 text-center text-[10px] self-center">{log.jobId}</span>
                <span className={`w-[140px] shrink-0 uppercase tracking-wider text-[11px] self-center ${log.agent === 'System' ? 'text-slate-400 dark:text-zinc-500' : 'text-slate-600 dark:text-zinc-300'}`}>{log.agent}</span>
                <span className="text-slate-600 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-zinc-200 transition-colors leading-relaxed">{log.message}</span>
              </div>
            ))
          )}
          <div className="flex gap-2 text-slate-400 dark:text-zinc-500 animate-pulse mt-4 p-1.5">
            <span className="w-2 h-4 bg-slate-300 dark:bg-zinc-500 inline-block" />
          </div>
        </div>
      </div>
    </div>
  );
}
