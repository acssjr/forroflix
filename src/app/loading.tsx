import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans animate-pulse">
      {/* Sidebar Esquerda Skeleton (Oculta em mobile) */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-5 shrink-0">
        <div className="space-y-7">
          {/* Logo Skeleton */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-xl" />
            <div className="w-28 h-5 bg-muted rounded-md" />
          </div>

          {/* Menu Items Skeletons */}
          <nav className="space-y-1.5">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="flex items-center gap-3.5 p-3 rounded-xl">
                <div className="w-5 h-5 bg-muted rounded-md shrink-0" />
                <div className="w-24 h-4 bg-muted rounded-md" />
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Base Skeletons */}
        <div className="space-y-3">
          <div className="flex items-center gap-3.5 p-3 rounded-xl">
            <div className="w-5 h-5 bg-muted rounded-md shrink-0" />
            <div className="w-20 h-4 bg-muted rounded-md" />
          </div>
          <div className="flex items-center gap-3.5 p-3 rounded-xl">
            <div className="w-5 h-5 bg-muted rounded-md shrink-0" />
            <div className="w-12 h-4 bg-muted rounded-md" />
          </div>
        </div>
      </aside>

      {/* Wrapper Principal */}
      <div className="flex-grow flex flex-col lg:flex-row min-w-0">
        
        {/* Mobile Header Skeleton */}
        <header className="md:hidden border-b border-sidebar-border bg-sidebar px-4 h-16 flex items-center justify-between shrink-0">
          <div className="w-24 h-5 bg-muted rounded-md" />
          <div className="w-8 h-8 bg-muted rounded-full" />
        </header>

        {/* Área Central Skeleton */}
        <main className="flex-grow px-4 sm:px-6 md:px-8 py-8 space-y-8 w-full overflow-y-auto">
          {/* Saudação Skeleton */}
          <div className="space-y-2">
            <div className="w-48 h-7 bg-muted rounded-md" />
            <div className="w-80 h-4 bg-muted rounded-md" />
          </div>

          {/* Barra de Pesquisa Skeleton */}
          <div className="w-full max-w-lg h-11 bg-card border border-border rounded-2xl" />

          {/* Seção Grid Skeleton */}
          <div className="space-y-4">
            <div className="w-36 h-5 bg-muted rounded-md" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="bg-card border border-border rounded-3xl p-6 flex flex-col items-center text-center space-y-4">
                  {/* Círculo do Progresso */}
                  <div className="w-20 h-20 rounded-full border-4 border-muted flex items-center justify-center" />
                  <div className="space-y-2 w-full flex flex-col items-center">
                    <div className="w-3/4 h-4 bg-muted rounded-md" />
                    <div className="w-1/2 h-3 bg-muted rounded-md" />
                  </div>
                  <div className="w-full h-9 bg-muted rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Painel Lateral Direito Skeleton (Oculto em telas menores que lg) */}
        <aside className="hidden lg:block w-90 bg-sidebar text-sidebar-foreground border-l border-sidebar-border p-6 space-y-8 shrink-0">
          {/* Cabeçalho Perfil */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-muted shrink-0" />
            <div className="space-y-1.5 min-w-0 flex-grow">
              <div className="w-24 h-4 bg-muted rounded-md" />
              <div className="w-16 h-3 bg-muted rounded-md" />
            </div>
          </div>

          {/* Estatísticas Lateral */}
          <div className="space-y-4">
            <div className="w-32 h-3 bg-muted rounded-md" />
            
            <div className="space-y-3.5">
              <div className="bg-sidebar-accent/50 rounded-2xl p-4 border border-sidebar-border/60 flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="w-24 h-3 bg-muted rounded-md" />
                  <div className="w-16 h-4 bg-muted rounded-md" />
                </div>
                <div className="w-5 h-5 bg-muted rounded-md" />
              </div>

              <div className="bg-sidebar-accent/50 rounded-2xl p-4 border border-sidebar-border/60 flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="w-24 h-3 bg-muted rounded-md" />
                  <div className="w-16 h-4 bg-muted rounded-md" />
                </div>
                <div className="w-5 h-5 bg-muted rounded-md" />
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
