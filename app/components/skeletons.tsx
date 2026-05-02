import type { CSSProperties } from "react";
import { GlassCard } from "./glass-card";

export function Skeleton({ className = "", style }: { className?: string, style?: CSSProperties }) {
  return (
    <div 
      className={`animate-pulse bg-brand-surface-3 rounded-xl ${className}`} 
      style={style}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Row Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <GlassCard key={i} className="p-6 h-[160px] flex flex-col justify-between">
            <Skeleton className="w-24 h-3 mb-4" />
            <Skeleton className="w-40 h-8" />
            <div className="mt-auto flex gap-2">
              <Skeleton className="w-12 h-5 rounded-full" />
              <Skeleton className="w-20 h-5 rounded-full" />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Left Side: Analytics Skeleton */}
        <div className="space-y-6">
          <GlassCard className="p-6 h-[300px]">
            <div className="flex justify-between mb-6">
              <Skeleton className="w-32 h-6" />
              <Skeleton className="w-24 h-8 rounded-lg" />
            </div>
            <div className="flex gap-4 items-end h-[180px]">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="flex-1" style={{ height: `${20 + Math.random() * 60}%` }} />
              ))}
            </div>
          </GlassCard>

          {/* Transactions List Skeleton */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <Skeleton className="w-40 h-5" />
              <Skeleton className="w-20 h-5" />
            </div>
            {[1, 2, 3, 4].map(i => (
              <GlassCard key={i} className="p-4 flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-1/2 h-4" />
                  <Skeleton className="w-1/4 h-3" />
                </div>
                <Skeleton className="w-24 h-5" />
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Right Side: Quick Action Skeleton */}
        <div className="hidden lg:block space-y-6">
          <GlassCard className="p-6 h-[400px]">
             <Skeleton className="w-32 h-5 mb-6" />
             <div className="space-y-4">
                <Skeleton className="w-full h-12" />
                <Skeleton className="w-full h-12" />
                <Skeleton className="w-full h-32" />
                <Skeleton className="w-full h-12" />
             </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 mt-3">
        <Skeleton className="w-full h-12 rounded-xl" />
        <div className="flex gap-2">
           <Skeleton className="w-20 h-8 rounded-full" />
           <Skeleton className="w-20 h-8 rounded-full" />
           <Skeleton className="w-20 h-8 rounded-full" />
        </div>
      </div>
      
      <GlassCard className="p-6 mt-3.5 space-y-6">
        {[1, 2].map(group => (
          <div key={group} className="space-y-3">
            <Skeleton className="w-24 h-3 mb-4" />
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-1/2 h-4" />
                  <Skeleton className="w-1/4 h-3" />
                </div>
                <Skeleton className="w-24 h-5" />
              </div>
            ))}
          </div>
        ))}
      </GlassCard>
    </div>
  );
}
