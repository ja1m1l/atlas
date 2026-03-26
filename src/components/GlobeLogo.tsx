"use client";

import React from 'react';
import Image from 'next/image';

export function GlobeLogo() {
  return (
    <div className="w-12 h-12 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.5)] shrink-0 flex items-center justify-center relative border border-cyan-400/50 bg-black/50">
      <Image
        src="/logo1.jpg"
        alt="AtlasOps Logo"
        fill
        sizes="48px"
        className="object-cover"
        priority
      />
    </div>
  );
}
