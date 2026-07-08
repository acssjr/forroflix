import React from 'react';

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans animate-pulse">
      {/* Header Admin Skeleton */}
      <header className="border-b border-border bg-card/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Voltar para Site link skeleton */}
            <div className="w-24 h-4 bg-muted rounded-md" />
            <span className="text-border">|</span>
            {/* Title skeleton */}
            <div className="w-32 h-5 bg-muted rounded-md" />
          </div>

          <div className="flex items-center gap-3">
            {/* Admin email skeleton */}
            <div className="w-36 h-4 bg-muted rounded-md hidden sm:inline" />
            {/* Theme button skeleton */}
            <div className="w-8 h-8 bg-muted rounded-xl" />
            {/* Action button skeleton */}
            <div className="w-28 h-8 bg-muted rounded-xl" />
          </div>
        </div>
      </header>

      {/* Admin Content Skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full space-y-6">
        
        {/* Sub-Tabs Selector Skeleton */}
        <div className="flex gap-2 p-1 bg-muted/40 border border-border rounded-2xl w-fit">
          <div className="w-32 h-8 bg-muted rounded-xl" />
          <div className="w-32 h-8 bg-muted rounded-xl" />
        </div>

        {/* Content Area Skeleton */}
        <div className="space-y-4">
          {/* Card 1 */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="w-48 h-5 bg-muted rounded-md" />
                <div className="w-72 h-4 bg-muted rounded-md" />
              </div>
              <div className="flex gap-2">
                <div className="w-16 h-8 bg-muted rounded-xl" />
                <div className="w-16 h-8 bg-muted rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="w-full h-24 bg-muted/60 rounded-xl" />
              <div className="w-full h-24 bg-muted/60 rounded-xl" />
              <div className="w-full h-24 bg-muted/60 rounded-xl" />
              <div className="w-full h-24 bg-muted/60 rounded-xl" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="w-40 h-5 bg-muted rounded-md" />
                <div className="w-64 h-4 bg-muted rounded-md" />
              </div>
              <div className="flex gap-2">
                <div className="w-16 h-8 bg-muted rounded-xl" />
                <div className="w-16 h-8 bg-muted rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="w-full h-24 bg-muted/60 rounded-xl" />
              <div className="w-full h-24 bg-muted/60 rounded-xl" />
              <div className="w-full h-24 bg-muted/60 rounded-xl" />
              <div className="w-full h-24 bg-muted/60 rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
