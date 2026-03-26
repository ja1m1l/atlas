"use client";

import React, { useState } from 'react';
import { useJobContext } from '../../store/JobContext';
import { Search, Filter, History, Download, MoreHorizontal } from 'lucide-react';

export function AuditTrail() {
  const { state } = useJobContext();
  const [searchTerm, setSearchTerm] = useState('');

  const auditLogs = [
    ...state.jobs.map(j => ({
      id: j.id,
      topic: j.topic,
      action: 'INITIATED',
      user: 'SYSTEM_ROUTER',
      time: j.createdAt,
      status: 'success'
    })),
    { id: 'JOB-099', topic: 'Annual Review Draft', action: 'BLOCK_TRIGGER', user: 'AGENT_COMPLAINCE', time: new Date(Date.now() - 3600000 * 24).toISOString(), status: 'fail' },
    { id: 'JOB-098', topic: 'EMEA Press Release', action: 'GATE_PASSED', user: 'HUMAN_APPROVER', time: new Date(Date.now() - 3600000 * 48).toISOString(), status: 'success' },
    { id: 'JOB-097', topic: 'Q2 Website Update', action: 'DEPLOYED_EDGE', user: 'AGENT_PUBLISH', time: new Date(Date.now() - 3600000 * 72).toISOString(), status: 'success' },
    { id: 'JOB-096', topic: 'Brand Guidelines', action: 'REVIEW_REQ', user: 'AGENT_L10N', time: new Date(Date.now() - 3600000 * 84).toISOString(), status: 'warning' },
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const filteredLogs = auditLogs.filter(log => 
    log.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 h-full flex flex-col gap-6 w-full max-w-[1400px] mx-auto overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
         <h1 className="text-[1.3rem] font-medium text-slate-900 dark:text-white mb-1 tracking-tight flex items-center gap-2">
           <History className="w-5 h-5 text-indigo-600 dark:text-zinc-500" /> Historic Telemetry
         </h1>
         
         <div className="flex items-center gap-3">
           <div className="relative group w-64">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 dark:group-focus-within:text-zinc-300 transition-colors" />
             <input 
               type="text" 
               placeholder="Filter logs..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full bg-white dark:bg-[#18181b] text-[13px] text-slate-800 dark:text-zinc-300 rounded-full pl-9 pr-4 py-2 outline-none border border-slate-200 dark:border-transparent focus:border-indigo-400 dark:focus:border-zinc-700 transition-all dark:placeholder:text-zinc-600 shadow-sm dark:shadow-none"
             />
           </div>
           <button className="bg-white dark:bg-[#18181b] hover:bg-slate-50 dark:hover:bg-[#27272a] p-2 rounded-full border border-slate-200 dark:border-transparent transition-colors text-slate-500 dark:text-zinc-400 dark:hover:text-white shadow-sm dark:shadow-none">
             <Filter className="w-4 h-4" />
           </button>
           <button className="bg-white dark:bg-[#18181b] hover:bg-slate-50 dark:hover:bg-[#27272a] p-2 rounded-full border border-slate-200 dark:border-transparent transition-colors text-slate-500 dark:text-zinc-400 dark:hover:text-white shadow-sm dark:shadow-none">
             <Download className="w-4 h-4" />
           </button>
         </div>
      </div>

      <div className="bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#27272a]/60 rounded-2xl flex-1 flex flex-col overflow-hidden ring-1 ring-inset ring-transparent dark:ring-white/5 shadow-sm">
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-[13px] whitespace-nowrap">
            <thead className="bg-slate-50/80 dark:bg-[#0f0f12]/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 dark:border-[#27272a]/80">
              <tr>
                <th className="px-6 py-4 font-mono text-[11px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-mono text-[11px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold">Job Reference</th>
                <th className="px-6 py-4 font-mono text-[11px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold">Topic Directive</th>
                <th className="px-6 py-4 font-mono text-[11px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold">Event Signature</th>
                <th className="px-6 py-4 font-mono text-[11px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold">Actor Node</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#27272a]/40 bg-transparent">
              {filteredLogs.map((log, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-[#18181b]/80 transition-colors group cursor-default">
                  <td className="px-6 py-3.5 font-mono text-slate-600 dark:text-zinc-400 text-[12px]">
                    {new Date(log.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="font-mono text-[10px] uppercase text-indigo-700 dark:text-zinc-300 bg-indigo-50 dark:bg-white/5 px-2 py-0.5 rounded border border-indigo-100 dark:border-white/10">{log.id}</span>
                  </td>
                  <td className="px-6 py-3.5 font-medium text-slate-800 dark:text-zinc-200">{log.topic}</td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono tracking-wider font-semibold border shadow-sm dark:shadow-none
                      ${log.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 
                        log.status === 'fail' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' : 
                        'bg-amber-50 dark:bg-zinc-500/10 text-amber-700 dark:text-zinc-400 border-amber-200 dark:border-zinc-500/20'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 dark:text-zinc-500 font-mono text-[11px]">{log.user}</td>
                  <td className="px-6 py-3.5 text-right w-10">
                    <button className="text-slate-400 dark:text-zinc-600 dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100 px-2 py-1 bg-slate-100 dark:bg-[#27272a]/50 rounded-md">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500 dark:text-zinc-500 font-mono text-[12px]">
                    No matching telemetry packets found for "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="h-14 border-t border-slate-200 dark:border-[#27272a]/60 bg-slate-50 dark:bg-[#0f0f12] flex items-center justify-between px-6 shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-zinc-500 font-mono tracking-widest uppercase">Showing {filteredLogs.length} logs</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-white dark:bg-[#18181b] dark:hover:bg-[#27272a] border border-slate-200 dark:border-[#27272a]/60 rounded-lg text-[11px] font-mono uppercase tracking-widest text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm dark:shadow-none">Prev</button>
            <button className="px-3 py-1.5 bg-white dark:bg-[#18181b] dark:hover:bg-[#27272a] border border-slate-200 dark:border-[#27272a]/60 rounded-lg text-[11px] font-mono uppercase tracking-widest text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm dark:shadow-none">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
