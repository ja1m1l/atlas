"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Filter, History, Download, MoreHorizontal } from 'lucide-react';

interface AuditEntry {
  id: string;
  display_id?: string;
  topic: string;
  action: string;
  actor: string;
  time: string;
  status: string;
}

export function AuditTrail() {
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Audit fetch fault:', error);
      } else {
        setLogs((data || []).map(l => ({
          id: l.job_id || '',
          display_id: l.job_display_id || '',
          topic: String(l.topic || 'System Maintenance'),
          action: String(l.action || 'System Action'),
          actor: String(l.actor || 'System Router'),
          time: l.created_at || new Date().toISOString(),
          status: String(l.status || 'success')
        })));
      }
      setLoading(false);
    };

    fetchAuditLogs();

    // Live subscription to audit logs
    const channel = supabase
      .channel('public:audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, payload => {
        const l = payload.new as any;
        setLogs(prev => [{
          id: l.job_id || '',
          display_id: l.job_display_id || '',
          topic: String(l.topic || 'System Maintenance'),
          action: String(l.action || 'System Action'),
          actor: String(l.actor || 'System Router'),
          time: l.created_at || new Date().toISOString(),
          status: String(l.status || 'success')
        }, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const safeSearch = (searchTerm || '').toLowerCase();
  const filteredLogs = logs.filter(log => {
    const s_topic = (log.topic || '').toLowerCase();
    const s_action = (log.action || '').toLowerCase();
    const s_id = (log.id || '').toLowerCase();
    return s_topic.includes(safeSearch) || 
           s_action.includes(safeSearch) ||
           s_id.includes(safeSearch);
  });

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
              {loading ? (
                 <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                       <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
                       <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Syncing History...</p>
                    </td>
                 </tr>
              ) : filteredLogs.map((log, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-[#18181b]/80 transition-colors group cursor-default">
                  <td className="px-6 py-3.5 font-mono text-slate-600 dark:text-zinc-400 text-[12px]">
                    {new Date(log.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="font-mono text-[10px] uppercase text-indigo-700 dark:text-zinc-300 bg-indigo-50 dark:bg-white/5 px-2 py-0.5 rounded border border-indigo-100 dark:border-white/10">
                      {log.display_id || (log.id ? log.id.slice(0, 8) : 'N/A')}
                    </span>
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
                  <td className="px-6 py-3.5 text-slate-500 dark:text-zinc-500 font-mono text-[11px]">{log.actor}</td>
                  <td className="px-6 py-3.5 text-right w-10">
                    <button className="text-slate-400 dark:text-zinc-600 dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100 px-2 py-1 bg-slate-100 dark:bg-[#27272a]/50 rounded-md">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredLogs.length === 0 && (
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
