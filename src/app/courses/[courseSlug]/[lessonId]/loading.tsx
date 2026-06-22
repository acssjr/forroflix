import { Skeleton } from '@/components/ui/skeleton';

export default function LessonLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Bar / Header */}
      <header className="border-b border-border bg-sidebar/90 backdrop-blur sticky top-0 z-40">
        <div className="px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-red-550/60">
              <Skeleton className="h-5 w-5 rounded bg-card/60" />
              <Skeleton className="h-4 w-28 rounded bg-card/40 hidden md:inline" />
            </div>
            <span className="text-border">|</span>
            <Skeleton className="h-5 w-44 rounded bg-card/50" />
          </div>

          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-28 rounded bg-card/40 hidden sm:inline" />
            <Skeleton className="h-9 w-32 rounded-lg bg-card/60" />
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-grow flex relative overflow-hidden animate-pulse">
        {/* Left Side: Video Player & Info */}
        <main className="flex-grow p-4 md:p-8 space-y-6 overflow-y-auto max-w-full">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Player Container */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
              <div className="text-slate-500 text-xs font-semibold uppercase animate-pulse tracking-widest">
                Iniciando reprodutor seguro...
              </div>
            </div>

            {/* Lesson Info Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
              <div className="space-y-2 flex-grow">
                <Skeleton className="h-8 w-2/3 rounded-lg bg-card/60" />
              </div>

              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-28 rounded-xl bg-card/60" />
                <Skeleton className="h-10 w-44 rounded-xl bg-card/80" />
              </div>
            </div>

            {/* Navigation Buttons (Prev/Next) */}
            <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-border">
              <Skeleton className="h-9 w-28 rounded bg-card/40" />
              <Skeleton className="h-9 w-28 rounded bg-card/60" />
            </div>

            {/* Seção de Anotações do Vídeo */}
            <div className="space-y-6 bg-card p-6 rounded-2xl border border-border shadow-md">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded bg-card/60" />
                  <Skeleton className="h-5 w-32 rounded bg-card/60" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full bg-card/50" />
              </div>

              {/* Textarea placeholder */}
              <div className="space-y-4">
                <Skeleton className="h-24 w-full rounded-xl bg-card/40" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-28 rounded bg-card/30" />
                    <Skeleton className="h-4 w-28 rounded bg-card/30" />
                  </div>
                  <Skeleton className="h-9 w-32 rounded-xl bg-card/60" />
                </div>
              </div>
            </div>

            {/* About section */}
            <div className="space-y-3 bg-card/40 p-6 rounded-2xl border border-border/50">
              <Skeleton className="h-4 w-32 rounded bg-card/50" />
              <Skeleton className="h-4 w-full rounded bg-card/30" />
              <Skeleton className="h-4 w-5/6 rounded bg-card/30" />
            </div>

          </div>
        </main>

        {/* Right Side: Collapsible Sidebar Menu (Desktop only layout) */}
        <aside className="shrink-0 border-l border-border bg-sidebar/95 w-80 md:w-96 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto hidden lg:flex">
          <div className="p-4 border-b border-border flex flex-col gap-3">
            <div className="flex justify-between items-center w-full">
              <Skeleton className="h-5 w-36 rounded bg-card/60" />
            </div>
            {/* Search Input placeholder */}
            <Skeleton className="h-8 w-full rounded-xl bg-card/40" />
          </div>

          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-border rounded-xl bg-card/40 overflow-hidden">
                {/* Accordion Trigger Header */}
                <div className="px-4 py-3 bg-card/85 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 flex-grow">
                    <Skeleton className="w-6 h-6 rounded-full bg-card/60" />
                    <Skeleton className="h-4 w-2/3 rounded bg-card/60" />
                  </div>
                  <Skeleton className="h-4 w-4 rounded bg-card/40" />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

