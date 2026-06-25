import { Skeleton } from '@/components/ui/skeleton';

export default function CourseLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header Premium do Topo */}
      <header className="border-b border-border bg-background/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center group">
            {/* Logo placeholder */}
            <Skeleton className="h-10 w-32 rounded-lg bg-card/60" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-28 rounded bg-card/40 hidden sm:inline" />
            <Skeleton className="h-9 w-28 rounded-lg bg-card/60" />
          </div>
        </div>
      </header>

      {/* Hero Banner do Curso (Hotmart Style) */}
      <section className="relative overflow-hidden border-b border-border bg-sidebar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12 animate-pulse">
          
          {/* Lado Esquerdo: Metadados, Progresso e Ações */}
          <div className="flex-grow space-y-6 max-w-2xl text-left w-full">
            {/* Voltar link */}
            <Skeleton className="h-4 w-16 rounded bg-card/40" />

            <div className="space-y-3">
              {/* Badge */}
              <Skeleton className="h-5 w-24 rounded-full bg-card/60" />
              {/* Title */}
              <Skeleton className="h-12 w-2/3 rounded-xl bg-card/85" />
              {/* Description */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded bg-card/50" />
                <Skeleton className="h-4 w-5/6 rounded bg-card/50" />
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-48 rounded bg-card/50" />
              <Skeleton className="h-2 w-72 rounded-full bg-card/40" />
            </div>

            {/* Botão de Continuar Assistindo */}
            <div className="pt-2">
              <Skeleton className="h-14 w-48 rounded-2xl bg-card/70" />
            </div>
          </div>

          {/* Lado Direito: Poster Estético Vertical (Oculto em telas pequenas) */}
          <div className="shrink-0 hidden md:block relative z-10">
            <div className="relative w-64 aspect-[3/4.2] rounded-3xl overflow-hidden bg-card/40 p-6 flex flex-col justify-between border border-border/15 shadow-2xl select-none">
              <Skeleton className="h-5 w-16 rounded-full bg-card/60" />
              <div className="flex-grow flex items-center justify-center">
                <Skeleton className="h-8 w-3/4 rounded-lg bg-card/60" />
              </div>
              <Skeleton className="h-3.5 w-1/2 rounded bg-card/40" />
            </div>
          </div>

        </div>
      </section>

      {/* Abas de Navegação (Hotmart Style) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-grow flex flex-col animate-pulse">
        <div className="border-b border-border flex gap-8 mb-8 pb-4">
          <div className="h-5 w-20 rounded bg-card/60 border-b-2 border-primary" />
          <Skeleton className="h-5 w-24 rounded bg-card/40" />
          <Skeleton className="h-5 w-16 rounded bg-card/40" />
        </div>

        {/* Conteúdo das Abas - Trilhas de Aprendizado */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded bg-card/60" />
            <Skeleton className="h-4 w-64 rounded bg-card/40" />
          </div>

          {/* Grid de Posters Verticais de Módulos (5 colunas no desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="flex flex-col gap-3">
                {/* Poster Card */}
                <div className="relative aspect-[3/4.2] w-full rounded-2xl bg-card/50 border border-border/30 p-4 flex flex-col justify-between">
                  <Skeleton className="h-6 w-6 rounded-full bg-card/60" />
                  <div className="flex-grow flex items-center justify-center">
                    <Skeleton className="h-6 w-3/4 rounded bg-card/60" />
                  </div>
                  <Skeleton className="h-3 w-1/2 rounded bg-card/40" />
                </div>
                
                {/* Text Metadata below card */}
                <div className="space-y-2 px-1">
                  <Skeleton className="h-4 w-3/4 rounded bg-card/60" />
                  <Skeleton className="h-3 w-1/2 rounded bg-card/40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

