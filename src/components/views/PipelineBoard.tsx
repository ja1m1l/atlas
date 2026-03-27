"use client";

import React, { useState } from 'react';
import { useJobContext, Job, JobStatus } from '../../store/JobContext';
import { Clock, AlertTriangle, PenTool, ShieldCheck, Globe, Clock4, PlaySquare, CheckCircle, ChevronRight } from 'lucide-react';
import { JobDetailPanel } from '../JobDetailPanel';

const COLUMNS: { id: JobStatus, icon: React.ReactNode, label: string }[] = [
  { id: 'Drafting', label: 'Drafting', icon: <PenTool className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-500" /> },
  { id: 'Compliance', label: 'Compliance', icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-500" /> },
  { id: 'Localization', label: 'L10N', icon: <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-500" /> },
  { id: 'Pending', label: 'Pending', icon: <Clock4 className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-500" /> },
  { id: 'Publishing', label: 'Publishing', icon: <PlaySquare className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-500" /> },
  { id: 'Published', label: 'Done', icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-500/80 dark:text-emerald-500/50" /> },
];

export function PipelineBoard() {
  const { state } = useJobContext();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  return (
    <div className="flex h-full w-full overflow-x-auto px-6 py-8 gap-4 bg-transparent items-start custom-scrollbar">
      {COLUMNS.map(column => {
        const jobs = state.jobs.filter(j => j.status === column.id);
        
        return (
          <div key={column.id} className="flex-shrink-0 w-[290px] h-full flex flex-col max-h-full">
            <div className="flex items-center justify-between mb-4 px-1 pb-2 border-b border-slate-200 dark:border-[#27272a]/50">
              <h3 className="font-medium text-[13px] text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                {column.icon}
                {column.label}
              </h3>
              <span className="text-xs font-mono text-slate-500 dark:text-zinc-500 bg-slate-100 dark:bg-[#18181b] px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-[#27272a]/40">{jobs.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 custom-scrollbar pb-12">
              {jobs.length === 0 ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div 
                      key={`skeleton-${i}`}
                      className="w-full h-[192px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#27272a]/40 bg-slate-50/20 dark:bg-[#141417]/20 p-4 flex flex-col justify-between opacity-50"
                    >
                      <div className="w-12 h-4 rounded-full bg-slate-200 dark:bg-zinc-800"></div>
                      <div className="flex flex-col gap-2 mt-4">
                        <div className="w-3/4 h-3.5 rounded bg-slate-200 dark:bg-zinc-800"></div>
                        <div className="w-1/3 h-3 rounded bg-slate-200 dark:bg-zinc-800"></div>
                      </div>
                      <div className="mt-auto flex flex-col gap-2 mb-4">
                        <div className="flex justify-between items-center">
                          <div className="w-10 h-2 rounded bg-slate-200 dark:bg-zinc-800"></div>
                          <div className="w-6 h-2 rounded bg-slate-200 dark:bg-zinc-800"></div>
                        </div>
                        <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-zinc-800"></div>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-200 dark:border-zinc-800/40 pt-3">
                        <div className="flex gap-1">
                          <div className="w-8 h-4 rounded bg-slate-200 dark:bg-zinc-800"></div>
                          <div className="w-10 h-4 rounded bg-slate-200 dark:bg-zinc-800"></div>
                        </div>
                        <div className="w-12 h-3 rounded bg-slate-200 dark:bg-zinc-800"></div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                jobs.map(job => (
                  <div 
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="bg-white dark:bg-[#141417] p-4 rounded-2xl cursor-pointer group hover:bg-slate-50 dark:hover:bg-[#18181b] transition-all border border-slate-200 dark:border-[#27272a]/60 shadow-sm dark:shadow-none ring-1 ring-inset ring-transparent dark:ring-white/5 hover:border-indigo-200 dark:hover:border-zinc-600/50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-zinc-400 bg-indigo-50 dark:bg-white/5 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-white/10 uppercase tracking-wider">
                        {job.display_id || job.id.slice(0, 8)}
                      </span>
                      {job.complianceIssues > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-sm border border-rose-100 dark:border-rose-500/20">
                          <AlertTriangle className="w-3 h-3" /> {job.complianceIssues} Flags
                        </span>
                      )}
                    </div>
                    
                    <h4 className="text-[15px] font-semibold text-slate-900 dark:text-zinc-100 mb-1 leading-snug group-hover:text-indigo-900 dark:group-hover:text-white transition-colors">{job.topic}</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mb-4">{job.audience}</p>
                    
                    <div className="flex flex-col gap-1.5 mb-4">
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-zinc-500">
                        <span>PROGRESS</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-[#0c0c0e] h-1 rounded-full overflow-hidden border border-slate-200 dark:border-[#27272a]/40">
                        <div 
                          className="h-full bg-indigo-500 dark:bg-zinc-300 transition-all duration-500" 
                          style={{ width: `${job.progress}%` }} 
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs border-t border-slate-200 dark:border-[#27272a]/40 pt-3">
                      <div className="flex gap-1">
                        {job.languages.map(lang => (
                          <span key={lang} className="text-[9px] font-mono text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-[#0c0c0e] border border-slate-200 dark:border-[#27272a]/60 px-1.5 py-0.5 rounded">
                            {lang}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] font-mono flex items-center gap-1.5 text-slate-400 dark:text-zinc-500 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Clock className="w-3 h-3" />
                        {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      <JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
