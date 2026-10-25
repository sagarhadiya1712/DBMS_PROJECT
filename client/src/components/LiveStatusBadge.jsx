import React from 'react';
import { useRealtimeStatus } from '../context/RealtimeContext';
import { RefreshCw } from 'lucide-react';

export default function LiveStatusBadge({ className = '' }) {
  const { status, lastEventTime, triggerManualRefresh } = useRealtimeStatus();

  let dotColor = 'bg-emerald-500';
  let pingColor = 'bg-emerald-400';
  let text = 'Live';
  let badgeBorder = 'border-emerald-500/30';
  let badgeBg = 'bg-emerald-500/10 text-emerald-300';

  if (status === 'connected') {
    dotColor = 'bg-emerald-400';
    pingColor = 'bg-emerald-400';
    text = 'Live';
    badgeBorder = 'border-emerald-500/25';
    badgeBg = 'bg-emerald-950/40 text-emerald-300';
  } else if (status === 'reconnecting') {
    dotColor = 'bg-amber-400';
    pingColor = 'bg-amber-400';
    text = 'Reconnecting';
    badgeBorder = 'border-amber-500/30';
    badgeBg = 'bg-amber-950/40 text-amber-300';
  } else if (status === 'polling') {
    dotColor = 'bg-sky-400';
    pingColor = 'bg-sky-400';
    text = 'Live Polling';
    badgeBorder = 'border-sky-500/30';
    badgeBg = 'bg-sky-950/40 text-sky-300';
  } else {
    dotColor = 'bg-rose-500';
    pingColor = 'bg-rose-500';
    text = 'Offline';
    badgeBorder = 'border-rose-500/30';
    badgeBg = 'bg-rose-950/40 text-rose-300';
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-md transition-all select-none ${badgeBorder} ${badgeBg} ${className}`}
      title={`Database Real-time Sync: ${text}${lastEventTime ? ` (Last DB change: ${new Date(lastEventTime).toLocaleTimeString()})` : ''}`}
    >
      <span className="relative flex h-2 w-2">
        {status === 'connected' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingColor}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
      </span>
      <span className="font-semibold tracking-wide uppercase text-[10px]">{text}</span>
    </div>
  );
}
