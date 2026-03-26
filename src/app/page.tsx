import React from 'react';
import { 
  Search, Camera as Instagram, ChevronDown, CheckCircle, 
  Grid, PieChart as PieChartIcon, Folder, Users, Star, MessageSquare,
  Settings, Download, MoreHorizontal, ArrowUpRight, ArrowDownRight,
  Sparkles, MousePointerClick, Info
} from 'lucide-react';
import { ReachBreakdownChart, AudienceDonut, AIAssistantChart } from '../components/Charts';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#050505] p-2 sm:p-4 text-[#e4e4e7] font-sans overflow-hidden flex">
      {/* Wrapper to simulate the app window */}
      <div className="flex w-full h-full max-w-[1440px] mx-auto bg-[#0f0f12] rounded-3xl border border-[#27272a]/40 shadow-2xl overflow-hidden shadow-black/80 ring-1 ring-white/5">
        {/* Sidebar */}
        <aside className="w-[68px] border-r border-[#27272a]/40 flex flex-col items-center py-6 gap-6 bg-[#0c0c0e] shrink-0 z-10">
          {/* Top Logo */}
          <div className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center font-bold text-xl">
            <span className="text-blue-600 block rounded-full w-5 h-5 bg-blue-600/20" />
          </div>
          
          {/* Nav Items */}
          <div className="flex flex-col gap-3 mt-4 flex-1 w-full items-center">
            <NavItem active icon={<Grid className="w-5 h-5" />} />
            <NavItem opacity icon={<PieChartIcon className="w-5 h-5" />} />
            <NavItem opacity icon={<Folder className="w-5 h-5" />} />
            <NavItem opacity icon={<Users className="w-5 h-5" />} />
            <NavItem opacity icon={<Star className="w-5 h-5" />} />
            <NavItem opacity icon={<MessageSquare className="w-5 h-5" />} />
          </div>

          {/* Bottom Items */}
          <div className="flex flex-col gap-3 w-full items-center mb-4">
            <NavItem opacity icon={<Settings className="w-5 h-5" />} />
            <NavItem opacity icon={<MoreHorizontal className="w-5 h-5" />} />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-[calc(100vh-2rem)] overflow-y-auto">
          {/* Header */}
          <header className="flex items-center justify-between px-8 py-5 border-b border-[#27272a]/20 shrink-0 sticky top-0 bg-[#0f0f12]/90 backdrop-blur z-20">
            <div className="relative group w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-[#18181b] text-sm text-zinc-300 rounded-full pl-9 pr-4 py-2 outline-none border border-transparent focus:border-zinc-700 transition-all font-medium placeholder:text-zinc-600"
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 bg-[#18181b] hover:bg-[#27272a] px-3 py-1.5 rounded-full text-sm font-medium border border-transparent transition-colors">
                <Instagram className="w-4 h-4 text-pink-500" />
                <span>Instagram</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>
              <button className="flex items-center gap-2 bg-[#18181b] hover:bg-[#27272a] px-1.5 py-1.5 rounded-full text-sm font-medium pr-4 border border-transparent transition-colors">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Galanganpra&backgroundColor=e4e4e7`} alt="User" className="w-6 h-6 rounded-full bg-zinc-800" />
                <span>Galanganpra</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
          </header>

          <div className="p-8 flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
            {/* Title & Stats */} 
            <div>
              <h1 className="text-[1.3rem] font-medium text-white mb-5 tracking-tight">Dashboard performance</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Reach" value="1.6K" trend="+7%" positive={true} />
                <StatCard title="Content interaction" value="19" trend="+38%" positive={true} />
                <StatCard title="Follower" value="1.1K" trend="+5%" positive={true} />
                <StatCard title="Link clicks" value="2" trend="+50%" positive={true} />
              </div>
            </div>

            {/* Middle Row */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
              {/* Left Box: Map area */}
              <div className="bg-[#141417] border border-[#27272a]/60 rounded-2xl p-6 relative overflow-hidden ring-1 ring-inset ring-white/5">
                {/* Decorative map gradient */}
                <div className="absolute top-0 left-0 w-2/3 h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <div /> {/* Spacer for title right-alignment in image if needed, actually it has Audience location title roughly middle/right */}
                  <h2 className="text-[13px] font-medium text-zinc-400">Audience location</h2>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-8 h-[240px] relative z-10">
                  {/* Map Visual (Mock) */}
                  <div className="relative h-full flex items-center justify-center opacity-70">
                    {/* Simple Dotted Map Pattern - mock for the complex map */}
                    <svg width="100%" height="100%" viewBox="0 0 500 250" className="opacity-40" preserveAspectRatio="xMidYMid meet">
                      {/* A very rough abstracted pattern of dots to simulate map continents */}
                      <g fill="currentColor" opacity="0.5">
                        {Array.from({length: 400}).map((_, i) => {
                          const x = (i % 25) * 20 + (Math.random()*4-2);
                          const y = Math.floor(i / 25) * 20 + (Math.random()*4-2);
                          // roughly exclude dots from ocean areas manually using basic math to form continents
                          const isAmerica = x > 50 && x < 150 && y > 20 && y < 150;
                          const isEuroAsia = x > 220 && x < 400 && y > 20 && y < 120;
                          const isAfrica = x > 220 && x < 300 && y > 100 && y < 200;
                          const isAus = x > 380 && x < 450 && y > 150 && y < 220;
                          if (isAmerica || isEuroAsia || isAfrica || isAus) {
                             // Randomly skip to make messy dots
                             if (Math.random() > 0.4) return <circle key={`dot-${i}`} cx={x} cy={y} r="1" />
                          }
                          return null;
                        })}
                      </g>
                      {/* Highlight Points and Connectors */}
                      <circle cx="100" cy="100" r="3" fill="#fff" className="shadow-[0_0_10px_#fff]" />
                      <circle cx="250" cy="80" r="3" fill="#fff" />
                      <circle cx="420" cy="180" r="3" fill="#fff" />
                      <circle cx="380" cy="140" r="3" fill="#fff" />
                      
                      <path d="M 100 100 Q 250 150 380 140" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                      <path d="M 250 80 Q 320 150 420 180" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                      <path d="M 380 140 Q 400 100 420 180" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
                    </svg>
                  </div>

                  {/* Right side of map box: Total impression & Donut */}
                  <div className="flex flex-col justify-between w-[240px] py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[13px] text-zinc-400 mb-1">Total impression</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-semibold text-white tracking-tight">12,514</span>
                          <span className="text-[10px] text-emerald-400 font-medium flex items-center bg-emerald-500/10 px-1 py-0.5 rounded">
                            <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> 37%
                          </span>
                        </div>
                      </div>
                      <div className="w-[50px] h-[50px]">
                        <AudienceDonut />
                      </div>
                    </div>
                    
                    {/* Country breakdown grid */}
                    <div className="grid grid-cols-4 gap-2 mt-auto">
                      <CountryStats name="Indonesia" percent="50%" trend="+56%" />
                      <CountryStats name="Australia" percent="30%" trend="+12%" />
                      <CountryStats name="United States" percent="10%" trend="+5%" />
                      <CountryStats name="Russia" percent="10%" trend="+4%" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Box: Content Types */}
              <div className="bg-transparent flex flex-col gap-4">
                {/* By Content Type Box */}
                <div className="bg-[#141417] border border-[#27272a]/60 rounded-2xl p-5 ring-1 ring-inset ring-white/5">
                  <h3 className="text-[13px] font-medium text-white mb-4">By content type</h3>
                  <div className="flex gap-2 mb-4">
                    <button className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-semibold">All</button>
                    <button className="bg-transparent text-zinc-400 px-4 py-1.5 rounded-full text-xs font-medium hover:text-white transition">Follower</button>
                    <button className="bg-transparent text-zinc-400 px-4 py-1.5 rounded-full text-xs font-medium hover:text-white transition">Non-Follower</button>
                  </div>
                  <div className="flex gap-4 items-center text-[10px] text-zinc-500 mb-5 pl-2">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-zinc-600" /> Follower</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-zinc-800" /> Non-Follower</div>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <ContentBar label="Stories" value1={40} value2={60} />
                    <ContentBar label="Post" value1={30} value2={70} />
                  </div>
                </div>

                {/* Profile Stats List Box */}
                <div className="bg-[#141417] border border-[#27272a]/60 rounded-2xl p-5 flex flex-col gap-4 justify-between flex-1 ring-1 ring-inset ring-white/5">
                   <ProfileStatRow label="Profile activity" date="Oct - Dec" value="306" trend="-28%" />
                   <ProfileStatRow label="Profile visits" date="Oct - Dec" value="302" trend="-26%" />
                   <ProfileStatRow label="External link taps" date="Oct - Dec" value="4" trend="-28%" />
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 pb-10">
               {/* Reach Breakdown */}
               <div className="bg-[#141417] border border-[#27272a]/60 rounded-2xl p-6 ring-1 ring-inset ring-white/5">
                 <div className="flex items-start justify-between mb-8">
                   <div>
                     <h3 className="text-sm font-medium text-white mb-1">Reach breakdown</h3>
                     <p className="text-[11px] text-zinc-500">insight overview</p>
                     <div className="flex gap-4 items-center text-[10px] text-zinc-500 mt-4">
                       <div className="flex items-center gap-1.5"><div className="w-2 h-2 shrink-0 rounded-[2px] bg-white" /> Total</div>
                       <div className="flex items-center gap-1.5"><div className="w-2 h-2 shrink-0 rounded-[2px] bg-zinc-500" /> From organic</div>
                     </div>
                   </div>
                   <div className="flex bg-[#0f0f12] rounded-lg p-1 border border-[#27272a]/40">
                     <button className="px-3 py-1.5 text-xs text-zinc-400 font-medium hover:text-white rounded-md transition">Daily</button>
                     <button className="px-3 py-1.5 text-xs text-black bg-white rounded-md font-medium shadow-sm">Commulative</button>
                   </div>
                 </div>
                 <div className="h-[220px] -ml-2">
                   <ReachBreakdownChart />
                 </div>
               </div>

               {/* AI Assistant Card */}
               <div className="bg-gradient-to-br from-[#1c1c21] to-[#0f0f12] border border-[#27272a]/60 rounded-2xl p-6 flex flex-col justify-end relative overflow-hidden group hover:border-[#404040]/80 transition-all ring-1 ring-inset ring-white/5">
                 {/* Abstract stars in bg */}
                 <div className="absolute top-4 right-4 text-white/20">
                   <Sparkles className="w-12 h-12" /> 
                 </div>
                 <div className="absolute top-2 left-6 text-white/5 w-1.5 h-1.5 rounded-full" />
                 <div className="absolute top-8 right-20 text-white/10 w-2 h-2 rounded-full blur-[1px]" />
                 <div className="absolute bottom-1/2 right-1/4 text-white/5 w-1 h-1 rounded-full" />

                 {/* AI Chart Overlay (subtle background element) */}
                 <div className="absolute inset-0 opacity-40 z-0 scale-110 translate-y-4">
                   <AIAssistantChart />
                 </div>
                 
                 <div className="relative z-10">
                   <div className="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center mb-3 backdrop-blur-md">
                     <Sparkles className="w-4 h-4 text-white" />
                   </div>
                   <h3 className="text-[15px] font-medium text-white mb-2">AI Assistant</h3>
                   <p className="text-xs text-zinc-400 leading-tight pr-4">Assist your content with our AI Assistant's personalized insight.</p>
                 </div>
               </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ active, opacity, icon }: { active?: boolean, opacity?: boolean, icon: React.ReactNode }) {
  return (
    <button className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
      ${active ? 'bg-[#27272a] text-white' : 'text-zinc-500 hover:text-white hover:bg-[#18181b]'}
      ${opacity ? 'opacity-60 hover:opacity-100' : ''}
    `}>
      {icon}
    </button>
  );
}

function StatCard({ title, value, trend, positive }: { title: string, value: string, trend: string, positive: boolean }) {
  return (
    <div className={`bg-[#141417] border rounded-2xl p-4 flex flex-col justify-between h-[100px] border-[#27272a]/60 ring-1 ring-inset ring-white/5 ${activeGlow(title)}`}>
      <div className="flex justify-between items-center w-full">
        <span className="text-xs font-medium text-zinc-400">{title}</span>
        <Info className="w-3.5 h-3.5 text-zinc-600" />
      </div>
      <div className="flex items-baseline gap-2 mt-auto">
        <span className="text-[28px] font-semibold text-white tracking-tight leading-none">{value}</span>
        <span className={`text-[10px] flex items-center px-1.5 py-0.5 rounded-md font-medium
          ${positive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}
        `}>
          <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> {trend}
        </span>
      </div>
    </div>
  );
}

// Very subtle border active state for the first card in the image
function activeGlow(title: string) {
  if (title === 'Reach') return 'border-zinc-600/50 shadow-sm shadow-white/5';
  return '';
}

function CountryStats({ name, percent, trend }: { name: string, percent: string, trend: string }) {
  const p = parseInt(percent);
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-zinc-500 mb-1 truncate">{name}</span>
      <span className="text-sm font-semibold text-white mb-2">{percent}</span>
      <div className="w-full h-1 bg-[#27272a] rounded-full mb-3 overflow-hidden">
        <div className="h-full bg-white rounded-full bg-gradient-to-r from-zinc-400 to-white" style={{ width: `${p}%` }} />
      </div>
      <span className="text-[10px] text-emerald-400 flex items-center font-medium">
        <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> {trend}
      </span>
    </div>
  );
}

function ContentBar({ label, value1, value2 }: { label: string, value1: number, value2: number}) {
  return (
    <div>
      <span className="text-[11px] text-zinc-400 mb-2 block">{label}</span>
      <div className="w-full h-8 flex gap-1">
        <div 
          className="h-full bg-white rounded-l-md transition-all duration-500"
          style={{ width: `${value1}%` }}
        />
        {/* Using CSS background repeating stripes to simulate the hash marks in the second part */}
        <div 
          className="h-full rounded-r-md transition-all duration-500 opacity-60"
          style={{ 
            width: `${value2}%`, 
            background: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              #52525b 2px,
              #52525b 3px
            )`
          }}
        />
      </div>
    </div>
  );
}

function ProfileStatRow({ label, date, value, trend }: { label: string, date: string, value: string, trend: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex flex-col">
        <span className="text-[13px] text-zinc-300 font-medium">{label}</span>
        <span className="text-[10px] text-zinc-600 uppercase tracking-wide mt-0.5">{date}</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[15px] font-semibold text-white">{value}</span>
        <span className="text-[10px] text-zinc-500 font-medium">{trend}</span>
      </div>
    </div>
  );
}
