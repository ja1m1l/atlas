"use client";

import React, { useState, useRef } from 'react';
import { useJobContext } from '../store/JobContext';
import { X, UploadCloud, FileText, Target, Globe2, File as FileIcon, Image as ImageIcon, Type, FileUp } from 'lucide-react';

export function NewJobModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useJobContext();
  const [topic, setTopic] = useState('');
  const [objective, setObjective] = useState('');
  const [objectiveMode, setObjectiveMode] = useState<'text' | 'pdf'>('text');
  const [objectivePdf, setObjectivePdf] = useState<File | null>(null);
  const [objectivePdfText, setObjectivePdfText] = useState('');
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [audience, setAudience] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['Instagram', 'Threads', 'LinkedIn', 'Twitter']);
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['EN']);
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    console.log('[AtlasOps] Uploading:', file.name);
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch('http://localhost:8000/api/upload', {
      method: 'POST',
      body: formData
    });
    const data = await resp.json();
    return data.url;
  };

  const extractPdfText = async (file: File) => {
    setIsExtractingPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('http://localhost:8000/api/extract-pdf', {
        method: 'POST',
        body: formData
      });
      
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ detail: 'Unknown error' }));
        const errorMessage = typeof errData.detail === 'object' 
          ? errData.detail.message || errData.detail.error 
          : errData.detail;
        throw new Error(errorMessage || 'PDF extraction failed');
      }

      const data = await resp.json();
      setObjectivePdfText(data.text || '');
      if (data.warning) {
        alert(data.warning);
      }
    } catch (err: any) {
      console.error('PDF extraction error:', err);
      alert(`Failed to extract text from PDF: ${err.message || 'Please try again or use text input.'}`);
      setObjectivePdf(null);
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const handlePdfSelect = async (file: File) => {
    setObjectivePdf(file);
    await extractPdfText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine the final objective text
    const finalObjective = objectiveMode === 'pdf' ? objectivePdfText : objective;

    if (!topic || !audience || !finalObjective || isUploading) return;

    try {
      setIsUploading(true);
      let imageUrl = "";

      // If an image was selected, upload it
      if (selectedImage) {
        imageUrl = await uploadFile(selectedImage);
      }

      // For this hackathon demo, we use the default organization ID
      const organization_id = "02c4a65c-bad2-41b4-8e69-9aed1b2cca4a";

        const response = await fetch('http://localhost:8000/api/pipeline/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_id,
            topic,
            objective: finalObjective,
            audience,
            channels: selectedChannels,
            target_languages: selectedLangs.map(l => l.toLowerCase()),
            spec_text: "",
            image_url: imageUrl
          })
        });

      if (!response.ok) throw new Error('Failed to start pipeline');
      onClose();
    } catch (err) {
      console.error('Pipeline error:', err);
      alert('Mission deployment failed. Verify backend is active on port 8000.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHoveringImage(true);
  };

  const handleImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHoveringImage(false);
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHoveringImage(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedImage(file);
      } else {
        alert('Please drop an image file (PNG, JPG, etc.)');
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImage(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePdfSelect(e.target.files[0]);
    }
  };

  const removePdf = () => {
    setObjectivePdf(null);
    setObjectivePdfText('');
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  // Determine if the form can be submitted
  const finalObjective = objectiveMode === 'pdf' ? objectivePdfText : objective;
  const canSubmit = topic && audience && finalObjective && selectedChannels.length > 0 && !isUploading && !isExtractingPdf;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-[600px] bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-[#27272a]/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-inset ring-transparent dark:ring-white/5 max-h-[90vh]">

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
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          {/* Mission Title */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Mission Title
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Q4 Earnings Campaign"
              className="w-full bg-white dark:bg-[#141417] text-[14px] text-slate-900 dark:text-zinc-200 rounded-xl px-4 py-3 border border-slate-300 dark:border-[#27272a]/60 focus:outline-none focus:border-indigo-400 dark:focus:border-zinc-500 focus:bg-white dark:focus:bg-[#18181b] transition-colors shadow-inner"
            />
          </div>

          {/* Primary Objective — Text OR PDF toggle */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> Primary Objective
              </label>
              <div className="flex bg-slate-100 dark:bg-[#141417] rounded-lg p-0.5 border border-slate-200 dark:border-[#27272a]/60">
                <button
                  type="button"
                  onClick={() => setObjectiveMode('text')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all
                    ${objectiveMode === 'text'
                      ? 'bg-white dark:bg-[#27272a] text-indigo-700 dark:text-zinc-200 shadow-sm border border-slate-200 dark:border-zinc-600/50'
                      : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-400'}`}
                >
                  <Type className="w-3 h-3" /> TEXT
                </button>
                <button
                  type="button"
                  onClick={() => setObjectiveMode('pdf')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all
                    ${objectiveMode === 'pdf'
                      ? 'bg-white dark:bg-[#27272a] text-indigo-700 dark:text-zinc-200 shadow-sm border border-slate-200 dark:border-zinc-600/50'
                      : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-400'}`}
                >
                  <FileUp className="w-3 h-3" /> PDF
                </button>
              </div>
            </div>

            {objectiveMode === 'text' ? (
              <textarea
                value={objective}
                onChange={e => setObjective(e.target.value)}
                placeholder="Describe what you want to achieve with this mission..."
                className="w-full h-24 bg-white dark:bg-[#141417] text-[14px] text-slate-900 dark:text-zinc-200 rounded-xl px-4 py-3 border border-slate-300 dark:border-[#27272a]/60 focus:outline-none focus:border-indigo-400 dark:focus:border-zinc-500 focus:bg-white dark:focus:bg-[#18181b] transition-colors shadow-inner resize-none"
              />
            ) : (
              <div className="flex flex-col gap-2">
                {objectivePdf ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] p-3 rounded-xl border border-slate-200 dark:border-[#27272a]/80 w-full shadow-sm group/file">
                      <FileIcon className="w-8 h-8 text-rose-500 shrink-0" />
                      <div className="flex flex-col overflow-hidden w-full text-left">
                        <span className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200 truncate">{objectivePdf.name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-500 font-mono">
                          {isExtractingPdf ? 'Extracting text...' : `${(objectivePdf.size / 1024 / 1024).toFixed(2)} MB`}
                        </span>
                      </div>
                      <button type="button" onClick={removePdf} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => pdfInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer group bg-slate-50 border-slate-300 hover:border-indigo-400 dark:bg-[#141417] dark:border-[#27272a]/80 dark:hover:border-zinc-600 dark:hover:bg-[#18181b]/50"
                  >
                    <FileUp className="w-6 h-6 text-slate-400 dark:text-zinc-500 mb-2 group-hover:text-indigo-500 dark:group-hover:text-zinc-400 transition-colors" />
                    <p className="text-[13px] text-slate-600 dark:text-zinc-400 font-medium">Click to upload PDF</p>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-600 mt-0.5 font-mono uppercase tracking-widest">Max 10MB</p>
                  </div>
                )}
                <input
                  type="file"
                  ref={pdfInputRef}
                  onChange={handlePdfChange}
                  className="hidden"
                  accept=".pdf"
                />
              </div>
            )}
          </div>

          {/* Demographics + Channels */}
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> Demographics
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
                <Globe2 className="w-3.5 h-3.5" /> Channels
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {['Instagram', 'Threads', 'LinkedIn', 'Twitter'].map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setSelectedChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all border
                      ${selectedChannels.includes(ch)
                        ? 'bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/30 shadow-sm'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-[#141417] dark:text-zinc-500 dark:border-[#27272a]/60 dark:hover:bg-[#18181b] dark:hover:border-zinc-600/50'}`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Localization Languages */}
          <div className="flex flex-col gap-3 p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                <Globe2 className="w-3.5 h-3.5" /> Content Languages
              </label>
              <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                Selected: {selectedLangs.join(', ')}
              </span>
            </div>
            
            <div className="flex items-center gap-4 pt-1">
                <div className="flex items-center gap-2 group cursor-not-allowed opacity-60">
                    <input 
                      type="checkbox" 
                      checked 
                      disabled 
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-slate-100"
                    />
                    <span className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">English (EN)</span>
                </div>

                <label className="flex items-center gap-2 group cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedLangs.includes('HI')}
                      onChange={(e) => {
                          if (e.target.checked) setSelectedLangs(prev => [...prev, 'HI']);
                          else setSelectedLangs(prev => prev.filter(l => l !== 'HI'));
                      }}
                      className="w-4 h-4 rounded border-slate-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-[#141417]"
                    />
                    <span className="text-[13px] font-medium text-slate-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-zinc-100">Hindi (HI)</span>
                </label>

                <label className="flex items-center gap-2 group cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedLangs.includes('MR')}
                      onChange={(e) => {
                          if (e.target.checked) setSelectedLangs(prev => [...prev, 'MR']);
                          else setSelectedLangs(prev => prev.filter(l => l !== 'MR'));
                      }}
                      className="w-4 h-4 rounded border-slate-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-[#141417]"
                    />
                    <span className="text-[13px] font-medium text-slate-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-zinc-100">Marathi (MR)</span>
                </label>
            </div>
            <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-600 mt-1 uppercase italic">
              {selectedLangs.length > 1 
                ? `Pipeline will pause for review after translating to: ${selectedLangs.filter(l => l !== 'EN').join(', ')}` 
                : "Base English version only — will skip localization step"}
            </p>
          </div>

          {/* Post Image (Optional) */}
          <div className="flex flex-col gap-2 mt-4">
            <label className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5" /> Post Image (Optional)
            </label>
            <div
              onClick={() => imageInputRef.current?.click()}
              onDragOver={handleImageDragOver}
              onDragLeave={handleImageDragLeave}
              onDrop={handleImageDrop}
              className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer group relative overflow-hidden
                ${isHoveringImage ? 'bg-indigo-50 border-indigo-400 dark:bg-[#18181b] dark:border-zinc-500' : 'bg-slate-50 border-slate-300 hover:border-indigo-400 dark:bg-[#141417] dark:border-[#27272a]/80 dark:hover:border-zinc-600 dark:hover:bg-[#18181b]/50'}
              `}
            >
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageChange}
                className="hidden"
                accept="image/*"
              />
              {selectedImage ? (
                <div className="flex flex-col items-center gap-2 relative z-10 w-full px-4">
                  <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] p-3 rounded-xl border border-slate-200 dark:border-[#27272a]/80 w-full shadow-sm group/file">
                    <ImageIcon className="w-8 h-8 text-indigo-500 shrink-0" />
                    <div className="flex flex-col overflow-hidden w-full text-left">
                      <span className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200 truncate">{selectedImage.name}</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-500 font-mono">{(selectedImage.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <button type="button" onClick={removeImage} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0 opacity-0 group-hover/file:opacity-100">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-slate-200 dark:bg-white/5 rounded-full mb-3 group-hover:bg-indigo-100 dark:group-hover:bg-white/10 transition-colors">
                    <ImageIcon className={`w-6 h-6 ${isHoveringImage ? 'text-indigo-600 dark:text-zinc-300' : 'text-slate-400 dark:text-zinc-500'}`} />
                  </div>
                  <p className="text-[13px] text-slate-600 dark:text-zinc-400 font-medium">Drop image or click to browse</p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-600 mt-1 font-mono uppercase tracking-widest">PNG, JPG, WEBP · Max 10MB</p>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
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
              disabled={!canSubmit}
              className="px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors rounded-xl text-[13px] font-semibold disabled:opacity-50 tracking-wide shadow-sm"
            >
              {isUploading ? 'DEPLOYING...' : isExtractingPdf ? 'PROCESSING PDF...' : 'DEPLOY MISSION'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
