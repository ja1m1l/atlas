"use client";

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Globe: any = dynamic(() => import('react-globe.gl').then((mod: any) => mod.default), { ssr: false });

export function GlobeLogo() {
  const globeEl = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const initGlobe = () => {
      if (globeEl.current && globeEl.current.pointOfView) {
        // Init properties
        globeEl.current.controls().enableZoom = false;
        globeEl.current.controls().enablePan = false;
        
        // Face India
        if (!isHovered) {
          globeEl.current.pointOfView({ lat: 20.5937, lng: 78.9629, altitude: 2 }, 1000);
        }
        
        globeEl.current.controls().autoRotate = isHovered;
        globeEl.current.controls().autoRotateSpeed = 6.0;
      }
    };
    
    // Ensure globe mounts properly
    const timer = setTimeout(initGlobe, 50);
    return () => clearTimeout(timer);
  }, [isHovered]);

  return (
    <div 
      className="w-12 h-12 rounded-xl overflow-hidden border border-slate-300 dark:border-[#27272a] shadow-md cursor-pointer flex items-center justify-center bg-[#010101] relative shrink-0 transition-transform duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="scale-[1.25] absolute inset-0 z-10 w-full h-full flex items-center justify-center pointer-events-none">
        {/* @ts-ignore */}
        <Globe
          ref={globeEl}
          width={45} 
          height={45}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
          backgroundColor="rgba(0,0,0,0)"
          atmosphereColor="#3b82f6"
          atmosphereAltitude={0.15}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 z-20 pointer-events-none rounded-xl" />
    </div>
  );
}
