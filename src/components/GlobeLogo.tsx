"use client";

import React from 'react';
import Image from 'next/image';

export function GlobeLogo() {
  return (
    <div className="w-12 h-12 shrink-0 flex items-center justify-center relative">
      {/* Subtle ambient glow behind the logo */}
      <div className="absolute inset-0 rounded-full bg-cyan-500/15 blur-xl scale-150 pointer-events-none" />
      
      {/* Logo with radial fade mask so edges dissolve into the background */}
      <div
        className="relative w-12 h-12"
        style={{
          maskImage: 'radial-gradient(circle, black 55%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 80%)',
        }}
      >
        <Image
          src="/logo1.png"
          alt="AtlasOps Logo"
          fill
          sizes="48px"
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
