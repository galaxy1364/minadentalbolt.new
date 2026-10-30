import React from 'react';

interface DentalSkeletonLoaderProps {
  type?: 'patient-card' | 'tooth-chart' | 'dashboard' | 'table';
  count?: number;
}

export const DentalSkeletonLoader: React.FC<DentalSkeletonLoaderProps> = ({
  type = 'patient-card',
  count = 3
}) => {
  if (type === 'tooth-chart') {
    return (
      <div className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 animate-pulse space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-4 w-32 bg-slate-200 rounded-md" />
          <div className="h-4 w-20 bg-slate-200 rounded-md" />
        </div>
        {/* Upper Jaw Arch Skeleton */}
        <div className="grid grid-cols-8 gap-1.5 pt-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`u_${i}`} className="h-14 rounded-xl bg-slate-200 flex flex-col items-center justify-between p-1">
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <div className="w-5 h-6 rounded-md bg-slate-300" />
            </div>
          ))}
        </div>
        {/* Quadrant Divider */}
        <div className="h-0.5 w-full bg-slate-300 rounded-full" />
        {/* Lower Jaw Arch Skeleton */}
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`l_${i}`} className="h-14 rounded-xl bg-slate-200 flex flex-col items-center justify-between p-1">
              <div className="w-5 h-6 rounded-md bg-slate-300" />
              <div className="w-3 h-3 rounded-full bg-slate-300" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'dashboard') {
    return (
      <div className="w-full space-y-3 animate-pulse">
        {/* Hero Card Skeleton */}
        <div className="w-full h-32 rounded-3xl bg-slate-200" />
        {/* 2-Column Module Tiles Skeleton */}
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200 p-3 flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="space-y-1">
                  <div className="h-3.5 w-20 bg-slate-300 rounded" />
                  <div className="h-2.5 w-14 bg-slate-300 rounded" />
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-300" />
              </div>
              <div className="h-3 w-16 bg-slate-300 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: Patient Card List Skeleton
  return (
    <div className="w-full space-y-2 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 bg-slate-200 rounded" />
              <div className="h-2.5 w-40 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="space-y-1 text-left">
            <div className="h-3 w-16 bg-slate-200 rounded" />
            <div className="h-2.5 w-12 bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
