"use client";

import React, { useState } from 'react';
import { useJobContext } from '../store/JobContext';
import { X, UploadCloud, FileText, Target, Globe2 } from 'lucide-react';

const LANGUAGES = ['EN', 'ES', 'FR', 'DE', 'JA'];

export function NewJobModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useJobContext();
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['EN']);
  const [isHoveringFile, setIsHoveringFile] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !audience) return;

    try {
      // For this hackathon demo, we use the default organization ID
      const organization_id = "02c4a65c-bad2-41b4-8e69-9aed1b2cca4a";
      
      const response = await fetch('http://localhost:8000/api/pipeline/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id,
          topic,
          audience,
          languages: selectedLangs,
          spec_text: "" 
        })
      });

      if (!response.ok) throw new Error('Failed to start pipeline');
      
      // The JobContext uses Supabase real-time subscriptions, 
      // so the new job will appear automatically on the board!
      onClose();
    } catch (err) {
      console.error('Pipeline error:', err);
      alert('Mission deployment failed. Verify backend is active on port 8000.');
    }
  };

  const toggleLang = (lang: string) => {
    setSelectedLangs(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-[600px] bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-[#27272a]/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-inset ring-transparent dark:ring-white/5">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-[#27272a]/40 bg-slate-50 dark:bg-[#0f0f12] shrink-0">
          <h2 className="text-[16px] font-medium text-slate-900 dark:text-white flex items-center gap-3">
             <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
             <span>Initialize New Mission</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-white p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-[#18181b] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Mission Topic / Abstract
            </label>
            <input 
              type="text" 
              required
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Q4 Earnings Press Release"
              className="w-full bg-white dark:bg-[#141417] text-[14px] text-slate-900 dark:text-zinc-200 rounded-xl px-4 py-3 border border-slate-300 dark:border-[#27272a]/60 focus:outline-none focus:border-indigo-400 dark:focus:border-zinc-500 focus:bg-white dark:focus:bg-[#18181b] transition-colors shadow-inner"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> Target Demographics
              </label>
              <input 
                type="text" 
                required
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="e.g. Retail Investors"
                className="w-full bg-white dark:bg-[#141417] text-[14px] text-slate-900 dark:text-zinc-200 rounded-xl px-4 py-3 border border-slate-300 dark:border-[#27272a]/60 focus:outline-none focus:border-indigo-400 dark:focus:border-zinc-500 focus:bg-white dark:focus:bg-[#18181b] transition-colors shadow-inner"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                <Globe2 className="w-3.5 h-3.5" /> Target Vectors (L10N)
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLang(lang)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all border
                      ${selectedLangs.includes(lang) 
                        ? 'bg-indigo-600 text-white dark:bg-zinc-200 dark:text-black border-transparent shadow-sm' 
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-[#141417] dark:text-zinc-500 dark:border-[#27272a]/60 dark:hover:bg-[#18181b] dark:hover:border-zinc-600/50'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <label className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
              <UploadCloud className="w-3.5 h-3.5" /> Context Source (Optional)
            </label>
            <div 
              onDragEnter={() => setIsHoveringFile(true)}
              onDragLeave={() => setIsHoveringFile(false)}
              className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer group
                ${isHoveringFile ? 'bg-indigo-50 border-indigo-400 dark:bg-[#18181b] dark:border-zinc-500' : 'bg-slate-50 border-slate-300 hover:border-indigo-400 dark:bg-[#141417] dark:border-[#27272a]/80 dark:hover:border-zinc-600 dark:hover:bg-[#18181b]/50'}
              `}
            >
              <div className="p-3 bg-slate-200 dark:bg-white/5 rounded-full mb-3 group-hover:bg-indigo-100 dark:group-hover:bg-white/10 transition-colors">
                 <UploadCloud className={`w-6 h-6 ${isHoveringFile ? 'text-indigo-600 dark:text-zinc-300' : 'text-slate-400 dark:text-zinc-500'}`} />
              </div>
              <p className="text-[13px] text-slate-600 dark:text-zinc-400 font-medium">Drop PDF/DOCX or click to browse</p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-600 mt-1 font-mono uppercase tracking-widest">Max 10MB</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-[#27272a]/40">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white bg-transparent hover:bg-slate-100 dark:hover:bg-[#18181b] transition-all"
            >
              CANCEL
            </button>
            <button 
              type="submit"
              disabled={!topic || !audience || selectedLangs.length === 0}
              className="px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors rounded-xl text-[13px] font-semibold disabled:opacity-50 tracking-wide shadow-sm"
            >
              DEPLOY MISSION
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
