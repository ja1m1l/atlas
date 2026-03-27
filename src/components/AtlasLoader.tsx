"use client";

import React from 'react';

export const AtlasLoader = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050505] overflow-hidden">
      <div className="spinner ml-[-40px]">
        <span>S</span>
        <span>A</span>
        <span>L</span>
        <span>T</span>
        <span>A</span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .spinner {
          position: relative;
          width: 60px;
          height: 60px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 50%;
        }

        /* Base styles for each letter */
        .spinner span {
          position: absolute;
          top: 50%;
          left: var(--left);
          font-family: var(--font-space-grotesk), sans-serif;
          font-weight: 900;
          font-style: italic;
          font-size: 28px;
          line-height: 1;
          color: #fff;
          
          animation: dominos 1s ease infinite;
          text-shadow: 2px 2px 3px rgba(0, 0, 0, 1);
          transform-origin: bottom left;
        }

        .spinner span:nth-child(1) {
          --left: 80px;
          animation-delay: 0.125s;
        }

        .spinner span:nth-child(2) {
          --left: 60px;
          animation-delay: 0.3s;
        }

        .spinner span:nth-child(3) {
          --left: 40px;
          animation-delay: 0.425s;
        }

        .spinner span:nth-child(4) {
          animation-delay: 0.54s;
          --left: 20px;
        }

        .spinner span:nth-child(5) {
          animation-delay: 0.665s;
          --left: 0px;
        }

        @keyframes dominos {
          50% {
            opacity: 0.7;
          }
          75% {
            transform: rotate(90deg);
          }
          80% {
            opacity: 1;
          }
        }
      `}} />
    </div>
  );
};
