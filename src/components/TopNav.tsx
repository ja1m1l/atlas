"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useJobContext } from '../store/JobContext';
import { Plus, Settings, HelpCircle, Eye } from 'lucide-react';
import { NewJobModal } from './NewJobModal';

const TABS = ['PIPELINE', 'AGENTS', 'ANALYTICS', 'RULES', 'AUDIT'];

export function TopNav() {
  const { state, dispatch } = useJobContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <nav className="h-[44px] shrink-0 border-b border-white/10 bg-[#07111f]/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
        {/* Left: Logo & Live Indicator */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="AtlasOps Logo" width={24} height={24} className="rounded-full object-cover shadow-[0_0_8px_rgba(6,182,212,0.4)] border border-cyan-400/30" />
            <span className="font-bold text-lg tracking-tight text-white">AtlasOps</span>
            <div className="flex items-center gap-1.5 ml-2 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-atlas-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-atlas-green"></span>
              </span>
              <span className="text-[10px] uppercase font-mono text-gray-300 tracking-wider">Live</span>
            </div>
          </div>

          {/* Center Tabs */}
          <div className="flex items-center gap-1 h-[44px]">
            {TABS.map((tab) => {
              const isActive = state.activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab })}
                  className={`h-full px-4 text-xs font-mono tracking-widest uppercase transition-all flex items-center border-b-2
                    ${isActive
                      ? 'border-atlas-amber text-atlas-amber font-semibold bg-white/5'
                      : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-white transition-colors">
            <Eye className="w-4 h-4" />
          </button>
          <button className="text-gray-400 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
          <button className="text-gray-400 hover:text-white transition-colors">
            <HelpCircle className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            onClick={() => setIsModalOpen(true)}
            className="atlas-btn-primary py-1.5 text-xs font-mono tracking-wide"
          >
            <Plus className="w-3.5 h-3.5" />
            NEW JOB
          </button>
        </div>
      </nav>

      {/* New Job Modal Component */}
      {isModalOpen && <NewJobModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
