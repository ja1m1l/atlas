"use client";

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Sparkles, Clock, ShieldAlert, IndianRupee, ActivitySquare, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCcw, StopCircle } from 'lucide-react';

import { useJobContext } from '../../store/JobContext';

export function AnalyticsView() {
  const { state } = useJobContext();
  const jobs = state.jobs;
  
  const totalJobs = jobs.length;

  let avgTurnaround = "0h 0m";
  let avgTurnaroundMs = 0;
  if (totalJobs > 0) {
    const totalMs = jobs.reduce((acc, job) => {
      const createdTime = job.createdAt ? new Date(job.createdAt).getTime() : Date.now();
      const diff = Date.now() - createdTime;
      return acc + (isNaN(diff) ? 0 : diff);
    }, 0);
    avgTurnaroundMs = totalMs / totalJobs;
    const hours = Math.floor(avgTurnaroundMs / (1000 * 60 * 60));
    const mins = Math.floor((avgTurnaroundMs % (1000 * 60 * 60)) / (1000 * 60));
    avgTurnaround = `${hours}h ${mins}m`;
  }

  let complianceRatingVal = 100;
  if (totalJobs > 0) {
    const jobsWithoutIssues = jobs.filter(j => j.complianceIssues === 0).length;
    complianceRatingVal = (jobsWithoutIssues / totalJobs) * 100;
  }
  const complianceRating = `${complianceRatingVal.toFixed(1)}%`;

  const totalValue = jobs.reduce((acc, job) => {
    const langCount = job.languages?.length || 1;
    const progressVal = job.progress || 0.1;
    const multiplier = progressVal > 0 ? progressVal / 100 : 0.1;
    return acc + (langCount * 12500 * multiplier);
  }, 0);
  const costReduction = `₹ ${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const durationData = [
    { stage: 'Drafts', val: jobs.filter(j => j.status === 'Drafting').length },
    { stage: 'Compliance', val: jobs.filter(j => j.status === 'Compliance').length },
    { stage: 'L10N', val: jobs.filter(j => j.status === 'Localization').length },
    { stage: 'Pending', val: jobs.filter(j => j.status === 'Pending').length },
    { stage: 'Publish', val: jobs.filter(j => j.status === 'Publishing' || j.status === 'Published').length },
  ];

  return (
    <div className="p-8 h-full flex flex-col gap-6 w-full max-w-[1400px] mx-auto overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-[1.3rem] font-medium text-slate-900 dark:text-white mb-1 tracking-tight">Swarm Analytics</h1>
          <p className="text-[13px] text-slate-500 dark:text-zinc-500">Performance telemetry and macro-economic operational insights.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard 
          title="Avg Turnaround" 
          value={avgTurnaround} 
          trend={totalJobs > 0 ? "Live" : "-"}
          positive={avgTurnaroundMs < 3600000 * 5} 
          icon={<Clock className="w-5 h-5 text-indigo-500 dark:text-zinc-400" />} 
        />
        <KPICard 
          title="Compliance Rating" 
          value={complianceRating} 
          trend={totalJobs > 0 ? "Live" : "-"} 
          positive={complianceRatingVal >= 90} 
          icon={<ShieldAlert className="w-5 h-5 text-indigo-500 dark:text-zinc-400" />} 
        />
        <KPICard 
          title="Cost Reduction" 
          value={costReduction} 
          trend={totalJobs > 0 ? "Live" : "-"} 
          positive={true} 
          icon={<IndianRupee className="w-5 h-5 text-indigo-500 dark:text-zinc-400" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
        {/* Charts */}
        <div className="lg:col-span-2 bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#27272a]/60 rounded-2xl p-6 shadow-sm dark:shadow-none ring-1 ring-inset ring-transparent dark:ring-white/5 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#27272a]/50 pb-4 mb-6">
            <h2 className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">Active Pipeline Load</h2>
            <div className="flex bg-slate-50 dark:bg-[#0f0f12] rounded-lg p-1 border border-slate-200 dark:border-[#27272a]/40">
              <button className="px-3 py-1 text-xs text-slate-800 dark:text-black bg-white rounded-md font-medium shadow-sm">count</button>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={1} className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" strokeOpacity={0.5} className="hidden dark:block" />
                <XAxis 
                  dataKey="stage" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(99,102,241,0.05)' }} 
                  contentStyle={{ backgroundColor: 'var(--tooltip-bg, #ffffff)', border: '1px solid var(--tooltip-br, #e2e8f0)', borderRadius: '8px', color: 'var(--tooltip-txt, #0f172a)' }}
                  itemStyle={{ color: 'var(--tooltip-txt, #0f172a)' }}
                />
                <Bar 
                  dataKey="val" 
                  radius={[4, 4, 0, 0]}
                  fill="url(#grad)"
                >
                </Bar>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" className="dark:stop-color-[#ffffff]" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#c7d2fe" className="dark:stop-color-[#d4d4d8]" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Strategic Insights */}
        <div className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-[#1c1c21] dark:to-[#0f0f12] border border-indigo-100 dark:border-[#27272a]/60 rounded-2xl p-6 shadow-sm dark:shadow-none ring-1 ring-inset ring-transparent dark:ring-white/5 relative overflow-hidden group flex flex-col">
          <div className="absolute top-4 right-4 text-indigo-500/5 dark:text-white/5">
            <ActivitySquare className="w-24 h-24" /> 
          </div>
          
          <h2 className="text-[14px] font-medium text-indigo-900 dark:text-zinc-200 mb-6 flex items-center gap-2 border-b border-indigo-100 dark:border-[#27272a]/40 pb-4 relative z-10">
            <Sparkles className="w-4 h-4 text-indigo-500 dark:text-zinc-400" /> Executive Insights
          </h2>
          
          <div className="space-y-4 relative z-10 flex-1">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-rose-600 dark:text-[#f87171]">Bottleneck Alert</span>
              <p className="text-[13px] text-slate-700 dark:text-zinc-300 leading-relaxed pl-3 border-l-2 border-rose-200 dark:border-[#f87171]/40">
                <span className="text-slate-900 dark:text-white font-semibold flex items-center gap-1.5"><StopCircle className="w-3 h-3 text-rose-600 dark:text-[#f87171]"/> {jobs.filter(j => j.status === 'Pending').length > 0 ? "Pending Node" : "Pipeline Node"}</span> 
                is showing activity proportional to active pending jobs array size.
              </p>
            </div>

            <div className="flex flex-col gap-2 mt-6">
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-600 dark:text-[#34d399]">Optimization Verified</span>
              <p className="text-[13px] text-slate-700 dark:text-zinc-300 leading-relaxed pl-3 border-l-2 border-emerald-200 dark:border-[#34d399]/40">
                 Localization routing has active {jobs.filter(j => j.status === 'Localization').length} missions dynamically updating streams.
              </p>
            </div>
          </div>
          
            <div className="flex flex-col gap-2 mt-6 pt-6 border-t border-indigo-100 dark:border-[#27272a]/40">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 dark:text-zinc-500">Mission Efficiency</span>
              <p className="text-[13px] text-slate-700 dark:text-zinc-300 leading-relaxed font-medium">
                Average swarm cycle: <span className="text-indigo-600 dark:text-zinc-200">{avgTurnaround}</span>
              </p>
              <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 dark:bg-zinc-400 transition-all duration-1000" 
                  style={{ width: `${Math.min(100, Math.max(10, (1 - avgTurnaroundMs / (3600000 * 24)) * 100))}%` }}
                />
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, trend, positive, icon }: any) {
  return (
    <div className="bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#27272a]/60 rounded-2xl p-5 flex flex-col justify-between h-[120px] shadow-sm dark:shadow-none ring-1 ring-inset ring-transparent dark:ring-white/5 overflow-hidden relative group hover:border-indigo-200 dark:hover:border-zinc-700/60 transition-colors">
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-indigo-50/50 dark:from-white/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex justify-between items-center w-full">
        <span className="text-[13px] font-medium text-slate-500 dark:text-zinc-400">{title}</span>
        <div className="p-2 bg-indigo-50 dark:bg-[#18181b] rounded-xl border border-indigo-100 dark:border-[#27272a]/40 shadow-sm">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between mt-auto">
        <span className="text-[32px] font-semibold text-slate-900 dark:text-white tracking-tight leading-none">{value}</span>
        <span className={`text-[11px] flex items-center px-1.5 py-0.5 rounded-md font-medium shadow-sm dark:shadow-none
          ${positive ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' : 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10'}
        `}>
          {positive ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : <ArrowUpRight className="w-3 h-3 mr-0.5" />} {trend}
        </span>
      </div>
    </div>
  );
}
