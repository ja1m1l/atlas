"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Job } from '../store/JobContext';
import { X, Terminal, Box, PlaySquare, AlertCircle, ShieldCheck, CheckCircle, Globe, RefreshCcw } from 'lucide-react';

export function JobDetailPanel({ job, onClose }: { job: Job | null; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isApproving, setIsApproving] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  // Editable content state — initialized from job.outputContent
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [selectedL10nLang, setSelectedL10nLang] = useState('en');
  const [localVariants, setLocalVariants] = useState<Record<string, any>>({});

  // Synchronize editedContent when job or its outputContent changes
  useEffect(() => {
    if (!job) return;

    if (job.id !== currentJobId) {
      // New job selected - reset state
      setCurrentJobId(job.id);
      if (job.outputContent) {
        setEditedContent({ ...job.outputContent });
      } else {
        setEditedContent({});
      }
    } else if (job.outputContent && Object.keys(editedContent).length === 0) {
      // Initial content load for same job
      setEditedContent({ ...job.outputContent });
    }

    if (job) {
      const variants: Record<string, any> = {
        en: { 
          blog: job.metadata?.draft_text || '', 
          ...(job.outputContent || {}) 
        }
      };
      if (job.localized_variants) {
        Object.entries(job.localized_variants).forEach(([lang, content]) => {
          variants[lang] = { ...content };
        });
      }
      setLocalVariants(variants);
    }
  }, [job]);

  const handleResume = async () => {
    if (!job || isResuming) return;
    setIsResuming(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    try {
      const resp = await fetch(`${backendUrl}/api/pipeline/resume/${job.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_variants: editedContent })
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);
      // Success! The job status will update via Supabase subscription
    } catch (err: any) {
      console.error('Resume logic failure:', err);
      alert(`Resume failed: ${err.message}`);
    } finally {
      setIsResuming(false);
    }
  };

  const handleContentChange = (platform: string, value: string) => {
    setEditedContent(prev => ({ ...prev, [platform]: value }));
  };

  const handleApprove = async () => {
    if (!job || isApproving) return;

    setIsApproving(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    try {
      const resp = await fetch(`${backendUrl}/api/jobs/${job.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_variants: editedContent })
      });
      if (!resp.ok) throw new Error('API Rejection');
    } catch (err) {
      console.error('Approval logic fault:', err);
      alert('Transmission failed. Ensure agent gateway is online.');
    } finally {
      setIsApproving(false);
    }
  };

  const isPending = job?.status === 'Pending';
  const isL10nReview = job?.status === 'Localization' && job?.progress === 80;
  const isL10nProcessing = job?.status === 'Localization' && job?.progress < 80;

  const PLATFORM_LABELS: Record<string, string> = {
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    threads: 'Threads',
    twitter: 'Twitter / X',
    email_subject: 'Email Subject',
  };

  const LANG_DATA = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
    { code: 'mr', label: 'Marathi', flag: '🇮🇳' },
  ];

  const selectedLangs = job?.target_languages ? job.target_languages.map(l => l.toLowerCase()) : ['en'];

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
                {job.display_id || job.id.slice(0, 8)}
              </span>
              <h2 className="font-medium text-[15px] text-slate-900 dark:text-zinc-100">{job.topic}</h2>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-[#18181b] transition-colors border border-transparent dark:hover:border-zinc-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* PART 5 — Localization Review Banner */}
          {isL10nReview && (
            <div className="bg-indigo-600/5 dark:bg-indigo-500/10 border-b border-indigo-100 dark:border-indigo-500/20 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <Globe className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest font-mono">Review Regional Content</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResume}
                  disabled={isResuming}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-[11px] font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isResuming ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  SEND FOR APPROVAL
                </button>
              </div>
            </div>
          )}

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
                    <Box className="w-3.5 h-3.5" /> Output Manifest
                  </h3>
                  <div className="font-sans text-[13px] text-slate-700 dark:text-zinc-300 leading-relaxed space-y-4 font-normal">
                    {job.status === 'Drafting' ? (
                      <div className="flex flex-col items-center justify-center py-8 opacity-40">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="font-mono text-[10px] uppercase tracking-widest">Generating Mission Draft...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {job.imageUrl && (
                          <img src={job.imageUrl} alt="Mission Asset" className="w-full h-40 object-cover rounded-xl border border-slate-200 dark:border-white/10 shadow-inner mb-4" />
                        )}
                        <p className="whitespace-pre-wrap mb-4">{job.outputContent ? job.outputContent.linkedin || job.outputContent.twitter : 'Content will appear here once generated.'}</p>

                        {job.publishedChannels && job.publishedChannels.length > 0 && (
                          <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                            <h4 className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mb-2 uppercase tracking-widest font-bold">Verified Transmission</h4>
                            <div className="flex flex-wrap gap-2">
                              {job.publishedChannels.map(ch => (
                                <span key={ch} className="px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[9px] font-mono rounded border border-emerald-200 dark:border-emerald-500/20 uppercase font-bold tracking-wider shadow-sm">
                                  {ch}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Compliance' && (() => {
              const complianceLog = (job.agentLogs || [])
                .filter(l => l.agent === 'Compliance Engine' && l.metadata?.compliance_details)
                .slice().reverse()[0];

              const issues = complianceLog?.metadata?.compliance_details || job.metadata?.compliance_details || [];
              const retries = complianceLog?.metadata?.compliance_retries || job.metadata?.compliance_retries || 1;

              return (
                <div className="space-y-4">
                  {(!issues || issues.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-emerald-50/20 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl">
                      <ShieldCheck className="w-8 h-8 text-emerald-500 mb-3 opacity-60" />
                      <p className="text-[11px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Zero Violations Detected</p>
                    </div>
                  ) : (
                    <>
                      {issues.map((issue: any, i: number) => (
                        <div key={i} className="bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20 p-5 rounded-2xl flex flex-col gap-3 ring-1 ring-inset ring-transparent dark:ring-rose-500/10 shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 right-0 px-3 py-1 bg-white/40 dark:bg-white/5 border-b border-l border-rose-200 dark:border-rose-500/20 rounded-bl-xl text-[9px] font-mono tracking-widest uppercase font-bold text-rose-500">
                            {issue.severity || 'high'}
                          </div>

                          <div className="space-y-2">
                            <span className="text-rose-600 dark:text-rose-400 block text-[12px] font-mono font-bold leading-relaxed line-through decoration-rose-500/40">
                              - {issue.sentence}
                            </span>
                            <span className="text-emerald-700 dark:text-emerald-400 block text-[12px] font-mono font-bold leading-relaxed">
                              + {issue.suggestion || 'Suggesting compliant variant...'}
                            </span>
                          </div>

                          <div className="pt-3 border-t border-rose-200 dark:border-rose-500/10 flex items-center justify-between">
                            <span className="text-[10px] text-rose-500/80 dark:text-rose-400/80 font-mono italic">
                              // Policy: {issue.violation}
                            </span>
                          </div>
                        </div>
                      ))}

                      {job.status === 'Compliance' && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span className="text-[10px] font-mono text-rose-500 uppercase tracking-widest">
                            Issue Remediation in progress — Attempt {retries} of 3
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

            {activeTab === 'Channels' && (
              <div className="space-y-4">
                {Object.keys(editedContent).length > 0 ? (
                  Object.entries(editedContent)
                    .filter(([key]) => key !== 'email_subject')
                    .map(([platform, content]) => (
                      <div key={platform} className="bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#27272a]/60 rounded-xl p-4 ring-1 ring-inset ring-transparent dark:ring-white/5 shadow-sm">
                        <h4 className="text-[10px] font-mono text-indigo-600 dark:text-zinc-500 mb-2 uppercase tracking-widest font-bold">
                          {PLATFORM_LABELS[platform] || platform}
                        </h4>
                        {isPending ? (
                          <textarea
                            value={content}
                            onChange={e => handleContentChange(platform, e.target.value)}
                            className="w-full min-h-[80px] bg-slate-50 dark:bg-[#0c0c0e] text-[12px] text-slate-600 dark:text-zinc-300 font-sans leading-relaxed rounded-lg px-3 py-2.5 border border-slate-200 dark:border-[#27272a]/60 focus:outline-none focus:border-indigo-400 dark:focus:border-zinc-500 transition-colors resize-y"
                          />
                        ) : (
                          <p className="text-[12px] text-slate-600 dark:text-zinc-300 font-sans leading-relaxed">{content}</p>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="flex items-center justify-center h-48 text-slate-400 dark:text-zinc-600 font-mono text-[10px] uppercase tracking-widest">Awaiting dispatch variants...</div>
                )}
              </div>
            )}

            {activeTab === 'Localization' && (
              <div className="space-y-6">
                {/* Language Toggle */}
                <div className="flex bg-slate-100 dark:bg-[#141417] p-1 rounded-xl border border-slate-200 dark:border-[#27272a]/60">
                  {LANG_DATA.filter(l => selectedLangs.includes(l.code)).map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedL10nLang(lang.code)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-mono font-bold transition-all
                        ${selectedL10nLang === lang.code 
                          ? 'bg-white dark:bg-[#27272a] text-indigo-700 dark:text-zinc-200 shadow-sm border border-slate-200 dark:border-zinc-600/50' 
                          : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-400'}`}
                    >
                      <span>{lang.flag}</span>
                      <span className="uppercase">{lang.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  {(() => {
                    const lang = LANG_DATA.find(l => l.code === selectedL10nLang) || LANG_DATA[0];
                    const isEN = lang.code === 'en';
                    const content = localVariants[lang.code] || (isEN ? job.outputContent : job.localized_variants?.[lang.code]);

                    const error = content?.error;
                    
                    // Filter platforms to only show what was actually generated/requested
                    const platforms = Object.keys(content || {})
                      .filter(k => k !== 'blog' && k !== 'email_subject' && k !== 'error');

                    return (
                      <div key={lang.code} className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200 dark:border-[#27272a]/60 p-6 shadow-sm ring-1 ring-inset ring-transparent dark:ring-white/5">
                        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100 dark:border-white/5">
                          <div className="flex items-center gap-3">
                            <span className="text-xl leading-none">{lang.flag}</span>
                            <h4 className="text-[12px] font-bold text-slate-900 dark:text-white uppercase tracking-widest">{lang.label} Version</h4>
                          </div>
                          <button 
                            onClick={() => {
                              if (content) {
                                // Extract only the channel variants (exclude blog, etc.)
                                const { blog, ...channelVariants } = content;
                                setEditedContent({ ...channelVariants });
                                setActiveTab('Channels');
                              }
                            }}
                            className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/20 font-bold uppercase hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-95"
                          >
                            Set as Final Content
                          </button>
                        </div>

                        {error ? (
                          <div className="bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-500" />
                            <div>
                              <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-tight">Translation Bridge Fault</p>
                              <p className="text-[10px] text-rose-500/80 font-mono mt-0.5">{error}</p>
                            </div>
                          </div>
                        ) : !isEN && !content ? (
                          <div className="flex flex-col items-center justify-center py-12 opacity-40">
                             <RefreshCcw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                             <p className="font-mono text-[10px] uppercase tracking-widest">Translating to {lang.label}...</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-bold">Blog / Long-form Draft</label>
                              <div className="bg-slate-50 dark:bg-[#0c0c0e] p-4 rounded-xl border border-slate-200 dark:border-[#27272a]/60 text-[13px] text-slate-700 dark:text-zinc-300 leading-relaxed font-sans max-h-[160px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                {content?.blog || '...'}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5">
                              {platforms.map(platform => {
                                const val = content?.[platform] || '';
                                return (
                                  <div key={platform} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <label className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-bold">
                                        {PLATFORM_LABELS[platform] || platform} variant
                                      </label>
                                      {platform === 'twitter' && (
                                        <span className={`text-[10px] font-mono font-bold ${val.length > 240 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                          {val.length}/240 {val.length <= 240 ? '✓' : '⚠'}
                                        </span>
                                      )}
                                    </div>
                                    <textarea
                                      value={val}
                                      onChange={(e) => {
                                        const newValue = e.target.value;
                                        setLocalVariants(prev => ({
                                          ...prev,
                                          [lang.code]: {
                                            ...(prev[lang.code] || {}),
                                            [platform]: newValue
                                          }
                                        }));
                                      }}
                                      className="w-full bg-slate-50 dark:bg-[#0c0c0e] p-4 rounded-xl border border-slate-200 dark:border-[#27272a]/60 text-[12px] text-slate-600 dark:text-zinc-400 font-sans leading-relaxed min-h-[100px] whitespace-pre-wrap focus:outline-none focus:border-indigo-400 dark:focus:border-zinc-500 transition-colors resize-y"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {isPending && (
            <div className="px-6 py-5 border-t border-slate-200 dark:border-[#27272a]/60 bg-white dark:bg-[#0c0c0e] shrink-0">
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-white dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-[13px] font-semibold tracking-wide transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 group"
              >
                {isApproving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <PlaySquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                )}
                {isApproving ? 'AUTHORIZING...' : 'APPROVE & DISPATCH TO EDGE'}
              </button>
            </div>
          )}

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
                    <span className="text-slate-400 dark:text-zinc-600 shrink-0 w-[50px]">{new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
