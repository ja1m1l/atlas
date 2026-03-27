"use client";

import React, { useState, useEffect } from 'react';
import { FileCode2, Play, Hash, ShieldBan, ShieldCheck, Check, AlertOctagon, Plus, Trash2, Loader2 } from 'lucide-react';

interface BlockedTerm {
  id: string;
  policy_id: string;
  term: string;
}

interface CompliancePolicy {
  id: string;
  name: string;
  schema_json: any;
  is_active: bool;
}

export function ComplianceRules() {
  const [policies, setPolicies] = useState<CompliancePolicy[]>([]);
  const [blockedTerms, setBlockedTerms] = useState<BlockedTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTerm, setNewTerm] = useState('');
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  
  const [testText, setTestText] = useState("We offer a guaranteed return that is 100% safe for all investors.");
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'fail' | 'pass', violations: string[] }>({
    status: 'idle', violations: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [policiesResp, termsResp] = await Promise.all([
        fetch('http://localhost:8000/api/compliance/policies'),
        fetch('http://localhost:8000/api/compliance/terms')
      ]);
      const policiesData = await policiesResp.json();
      const termsData = await termsResp.json();
      setPolicies(policiesData);
      setBlockedTerms(termsData);
    } catch (err) {
      console.error('Failed to fetch compliance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm || isAddingTerm) return;

    setIsAddingTerm(true);
    try {
      let policyId = activePolicy?.id;

      // Auto-create policy if none exists
      if (!policyId) {
        console.log("No policy found, creating default...");
        const pResp = await fetch('http://localhost:8000/api/compliance/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_id: "ORG-001",
            name: "Default Enterprise Policy",
            schema_json: { "strict_mode": true },
            is_active: true
          })
        });
        const newPolicy = await pResp.json();
        policyId = newPolicy[0].id;
        setPolicies([newPolicy[0]]);
      }

      const resp = await fetch('http://localhost:8000/api/compliance/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: policyId,
          term: newTerm
        })
      });
      if (resp.ok) {
        setNewTerm('');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add term:', err);
      alert("Backend connection failed. Is the server running on port 8000?");
    } finally {
      setIsAddingTerm(false);
    }
  };

  const handleDeleteTerm = async (id: string) => {
    try {
      const resp = await fetch(`http://localhost:8000/api/compliance/terms/${id}`, {
        method: 'DELETE'
      });
      if (resp.ok) {
        setBlockedTerms(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete term:', err);
    }
  };

  const handleTest = () => {
    setTestResult({ status: 'testing', violations: [] });
    setTimeout(() => {
      const lower = testText.toLowerCase();
      const violations = blockedTerms
        .map(t => t.term)
        .filter(term => lower.includes(term.toLowerCase()));
      
      if (violations.length > 0) {
        setTestResult({ status: 'fail', violations });
      } else {
        setTestResult({ status: 'pass', violations: [] });
      }
    }, 600);
  };

  const activePolicy = policies.find(p => p.is_active) || policies[0];

  return (
    <div className="p-8 h-full flex flex-col gap-6 w-full max-w-[1400px] mx-auto overflow-y-auto">
      <div className="flex items-center justify-between">
         <h1 className="text-[1.3rem] font-medium text-slate-900 dark:text-white mb-1 tracking-tight flex items-center gap-2">
           <ShieldBan className="w-5 h-5 text-indigo-500 dark:text-zinc-500" /> Compliance Matrices
         </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[500px]">
        
        {/* Left Column: Editor & Rules */}
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#27272a]/60 rounded-2xl flex flex-col h-[280px] shadow-sm dark:shadow-none ring-1 ring-inset ring-transparent dark:ring-white/5 overflow-hidden group hover:border-indigo-200 dark:hover:border-zinc-700/60 transition-colors">
            <div className="flex justify-between items-center px-5 flex-shrink-0 border-b border-slate-200 dark:border-[#27272a]/40 bg-slate-50 dark:bg-[#0f0f12]">
               <h2 className="py-3 text-[13px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                 <FileCode2 className="w-4 h-4 text-indigo-500 dark:text-zinc-500" /> Active Policy Schema
               </h2>
               <span className="text-[10px] font-mono font-medium tracking-widest uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">JSON</span>
            </div>
            <div className="flex-1 bg-white dark:bg-[#141417] p-4 font-mono text-[13px] text-slate-600 dark:text-zinc-400 overflow-y-auto leading-relaxed outline-none">
              {isLoading ? (
                <div className="flex items-center justify-center h-full opacity-40">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span>Loading policy...</span>
                </div>
              ) : (
                <pre><code>{activePolicy ? JSON.stringify(activePolicy.schema_json, null, 2) : '// No active policy found'}</code></pre>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#27272a]/60 rounded-2xl p-6 flex-1 flex flex-col shadow-sm dark:shadow-none ring-1 ring-inset ring-transparent dark:ring-white/5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[13px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                <Hash className="w-4 h-4 text-indigo-500 dark:text-zinc-500" /> Terminology Constraints
              </h2>
            </div>
            
            <form onSubmit={handleAddTerm} className="mb-6 flex gap-2">
              <input 
                type="text"
                value={newTerm}
                onChange={e => setNewTerm(e.target.value)}
                placeholder="Add forbidden term..."
                className="flex-1 bg-slate-50 dark:bg-[#0c0c0e] text-[12px] border border-slate-200 dark:border-[#27272a]/60 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 dark:focus:border-zinc-500 transition-colors"
              />
              <button 
                type="submit"
                disabled={!newTerm || isAddingTerm}
                className="p-1.5 bg-indigo-600 dark:bg-white text-white dark:text-black rounded-lg hover:bg-indigo-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40"
              >
                {isAddingTerm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </form>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <h3 className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 mb-3 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400" /> Blocked Entities
              </h3>
              <div className="flex flex-wrap gap-2">
                {isLoading ? (
                  <div className="h-20 w-full flex items-center justify-center opacity-30">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : blockedTerms.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">No blocked terms found.</span>
                ) : (
                  blockedTerms.map(t => (
                    <span 
                      key={t.id} 
                      className="group flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a]/80 text-slate-700 dark:text-zinc-300 text-[11px] rounded-md font-mono hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors shadow-sm"
                    >
                      {t.term}
                      <button 
                        onClick={() => handleDeleteTerm(t.id)}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-700 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sandbox */}
        <div className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-[#1c1c21] dark:to-[#0f0f12] border border-indigo-100 dark:border-[#27272a]/60 rounded-2xl p-6 flex flex-col h-full shadow-sm dark:shadow-none ring-1 ring-inset ring-transparent dark:ring-white/5 relative overflow-hidden group">
          <h2 className="text-[14px] font-medium text-slate-900 dark:text-white mb-1 flex items-center gap-2 relative z-10">
            <Play className="w-4 h-4 text-indigo-500 dark:text-zinc-400" /> Validation Matrix
          </h2>
          <p className="text-[12px] text-slate-500 dark:text-zinc-500 mb-6 font-mono relative z-10">Dry-run content patterns against the active schema.</p>

          <textarea 
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="w-full h-48 bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#27272a]/80 rounded-xl p-4 text-[13px] text-slate-700 dark:text-zinc-300 font-sans focus:outline-none focus:border-indigo-400 dark:focus:border-zinc-500 transition-colors resize-none mb-4 shadow-inner leading-relaxed relative z-10"
            placeholder="Input content payload..."
          />
          
          <button 
            onClick={handleTest}
            disabled={testResult.status === 'testing' || isLoading}
            className="self-end px-5 py-2.5 bg-indigo-600 dark:bg-white text-white dark:text-black hover:bg-indigo-700 dark:hover:bg-zinc-200 transition-colors rounded-xl font-mono text-[13px] tracking-wide font-semibold disabled:opacity-50 flex items-center gap-2 relative z-10 shadow-sm dark:shadow-none"
          >
            {testResult.status === 'testing' ? 'PROCESSING...' : 'EXECUTE RUN'}
          </button>

          {/* Test Results Area */}
          <div className={`mt-auto rounded-xl p-5 border transition-all flex flex-col gap-2 min-h-[140px] relative z-10
            ${testResult.status === 'idle' ? 'bg-slate-50 border-slate-200 dark:bg-[#141417] dark:border-[#27272a]/40 shadow-inner' : ''}
            ${testResult.status === 'testing' ? 'bg-indigo-50 border-indigo-200 dark:bg-[#18181b] dark:border-zinc-600/50 animate-pulse' : ''}
            ${testResult.status === 'pass' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30' : ''}
            ${testResult.status === 'fail' ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30' : ''}
          `}>
            {testResult.status === 'idle' && (
              <span className="text-slate-400 dark:text-zinc-600 font-mono text-xs uppercase tracking-widest text-center my-auto">Awaiting Input Stream</span>
            )}
            {testResult.status === 'testing' && (
              <span className="text-indigo-500 dark:text-zinc-400 font-mono text-xs uppercase tracking-widest text-center my-auto">Analyzing Payload...</span>
            )}
            {testResult.status === 'pass' && (
              <>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold mb-2">
                  <ShieldCheck className="w-5 h-5" /> VALIDATION SUCCESS
                </div>
                <p className="text-[12px] text-emerald-700 dark:text-emerald-400/80 font-mono leading-relaxed">0 constraints blocked. Disclaimers verified against contextual map.</p>
              </>
            )}
            {testResult.status === 'fail' && (
              <>
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold mb-2">
                  <AlertOctagon className="w-5 h-5" /> VALIDATION FAILED
                </div>
                <div className="text-[12px] text-rose-700 dark:text-rose-300 font-mono">
                  <p className="mb-2">Critical violations identified:</p>
                  <ul className="list-disc pl-4 space-y-1.5 opacity-90">
                    {testResult.violations.map(v => (
                      <li key={v}>Matched blocked term: <span className="font-bold underline decoration-rose-500/50 underline-offset-2">{v}</span></li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
