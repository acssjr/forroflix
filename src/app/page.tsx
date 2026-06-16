import Link from 'next/link';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/button';
import { LoginForm } from '@/components/login-form';
import { Music, LogOut, Settings, Play, ShieldAlert } from 'lucide-react';
import { GlobalFavorites } from '@/components/global-favorites';

const MOCK_COURSES = [
  {
    id: 'course-1',
    title: 'Forró Universitário - Do Zero ao Passo Básico',
    description: 'Aprenda os passos fundamentais: o balanço lateral, a caminhada, a virada simples e a condução inicial.',
    slug: 'forro-universitario-basico',
    thumbnail_gradient: 'from-blue-600 to-indigo-700',
    center_text: 'FORRÓ\nUNIVERSITÁRIO',
    label: 'Curso de Forró Básico'
  },
  {
    id: 'course-2',
    title: 'Forró Pé de Serra - Giros e Condução',
    description: 'Domine a arte do cavalheiro e da dama: giros simultâneos, travas de braço e giros dinâmicos.',
    slug: 'forro-pe-de-serra-giros',
    thumbnail_gradient: 'from-purple-600 to-pink-700',
    center_text: 'GIROS &\nCONDUÇÃO',
    label: 'Curso Pé de Serra'
  },
  {
    id: 'course-3',
    title: 'Estilo Roots - Musicalidade e Charme',
    description: 'Aprenda o autêntico Forró Roots: giros cruzados, passos arrastados e como interpretar o ritmo da sanfona e da zabumba.',
    slug: 'estilo-roots-musicalidade',
    thumbnail_gradient: 'from-orange-500 to-red-600',
    center_text: 'ESTILO\nROOTS',
    label: 'Curso Roots Avançado'
  }
];

export default async function Home() {
  // 1. Verificar autenticação via cookie JWT
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const user = sessionToken ? (await verifyJWT(sessionToken)) as any : null;

  // Se NÃO estiver logado, exibe a tela de login estilizada com fundo estético de catálogo
  if (!user) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8 overflow-hidden bg-black font-sans">
        {/* Imagem de Fundo (Aesthetic Catalog Grid) */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-[4px] scale-105 pointer-events-none"
          style={{ backgroundImage: 'url("/login-bg.png")' }}
        />
        {/* Overlay Escuro com Gradiente */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/90 z-0 pointer-events-none" />
        
        {/* Formulário de Login Centralizado */}
        <LoginForm />
      </div>
    );
  }

  // 2. Se ESTIVER logado, busca os cursos do D1 ou usa os mocks
  let coursesList = MOCK_COURSES;
  let favoritesList: any[] = [];
  
  const rawPullZone = process.env.BUNNY_STREAM_PULL_ZONE || process.env.BUNNY_STREAM_LIBRARY_ID || '';
  const pullZone = rawPullZone.startsWith('vz-') ? rawPullZone.substring(3) : rawPullZone;

  try {
    const db = getDB();
    
    // Buscar cursos e favoritos em paralelo
    const [coursesRes, favoritesRes] = await Promise.all([
      db.prepare('SELECT * FROM courses ORDER BY created_at DESC').all<any>(),
      db.prepare(`
        SELECT DISTINCT
          l.id, 
          l.title, 
          l.video_id, 
          l.duration_seconds, 
          c.id as course_id, 
          c.slug as course_slug, 
          c.title as course_title,
          m.title as module_title
        FROM favorite_folder_lessons ffl
        JOIN favorite_folders ff ON ffl.folder_id = ff.id
        JOIN lessons l ON ffl.lesson_id = l.id
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE ffl.user_id = ? AND ff.is_global = 1
        ORDER BY ffl.created_at DESC
      `).bind(user.id).all<any>()
    ]);

    const results = coursesRes.results;
    favoritesList = favoritesRes.results || [];
    
    if (results && results.length > 0) {
      coursesList = results.map((c, i) => {
        // Encontrar correspondência de mock para pegar center_text e label adicionais
        const mockMatch = MOCK_COURSES[i % MOCK_COURSES.length];
        return {
          id: c.id,
          title: c.title,
          description: c.description || 'Aulas exclusivas do Forroflix.',
          slug: c.slug,
          thumbnail_gradient: c.thumbnail_gradient || mockMatch.thumbnail_gradient,
          center_text: c.title.split(' - ')[0].toUpperCase(),
          label: 'Curso Online'
        };
      });
    }
  } catch (err) {
    console.warn('[D1] Erro na home, exibindo catálogo simulado.', err);
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-[#060609] text-slate-100 flex flex-col font-sans animate-page-enter">
      {/* Header Premium do Catálogo */}
      <header className="border-b border-slate-900 bg-[#060609]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="bg-gradient-to-tr from-orange-500 to-red-600 p-2 rounded-xl text-white group-hover:rotate-6 transition-transform">
              <Music className="w-5 h-5" />
            </div>
            <span className="font-black text-xl tracking-tighter bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
              FORROFLIX
            </span>
          </Link>
          
          <nav className="flex items-center gap-4">
            {isAdmin && (
              <Link href="/admin">
                <Button variant="outline" className="border-orange-500/20 hover:bg-orange-950/20 text-orange-400 gap-2 text-xs py-2 px-4 rounded-xl">
                  <Settings className="w-3.5 h-3.5" />
                  Painel Admin
                </Button>
              </Link>
            )}
            <span className="text-xs text-slate-400 hidden sm:inline">{user.email}</span>
            <form action="/api/auth/logout" method="POST" className="inline">
              <Button type="submit" variant="ghost" className="text-slate-400 hover:text-red-400 gap-1.5 hover:bg-red-950/20 text-xs py-2 px-4">
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </Button>
            </form>
          </nav>
        </div>
      </header>

      {/* Catálogo de Cursos (Netflix-Style Vertical Cards) */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full space-y-12">
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
            O que você quer aprender a dançar hoje?
          </h2>
          <p className="text-xs text-slate-400">Escolha um dos cursos abaixo e inicie sua jornada no Forró.</p>
        </div>

        {/* Grid de Cartões Verticais (Inspirado no Layout enviado) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {coursesList.map((course) => (
            <div key={course.id} className="flex flex-col gap-3 group">
              <Link 
                href={`/courses/${course.slug}`}
                className={`relative aspect-[3/4.2] w-full rounded-3xl overflow-hidden bg-gradient-to-b ${course.thumbnail_gradient} p-6 flex flex-col justify-between border-2 border-transparent hover:border-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] shadow-2xl`}
              >
                {/* Elementos Estéticos Internos */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                <div className="absolute top-6 left-6 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold text-white tracking-widest uppercase border border-white/5">
                  Premium
                </div>

                {/* Texto Centralizado Verticalmente em Destaque */}
                <div className="flex-grow flex items-center justify-center text-center select-none py-12">
                  <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-none whitespace-pre-line drop-shadow-lg font-sans">
                    {course.center_text}
                  </h3>
                </div>

                {/* Ícone de Ação no Rodapé do Card */}
                <div className="flex justify-between items-center relative z-10">
                  <span className="text-[10px] font-bold text-white/60 tracking-wider uppercase">
                    Curso Online
                  </span>
                </div>
              </Link>

              {/* Informações Textuais Abaixo do Card */}
              <div className="px-1 space-y-0.5">
                <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase block">
                  {course.label}
                </span>
                <Link href={`/courses/${course.slug}`} className="text-sm font-extrabold text-white hover:text-orange-400 transition-colors block leading-tight">
                  {course.title}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Global Saved Lessons for Review */}
        {favoritesList.length > 0 && (
          <div className="border-t border-slate-900/60 pt-12">
            <GlobalFavorites initialFavorites={favoritesList} libraryId={pullZone} />
          </div>
        )}
      </main>

      {/* Rodapé */}
      <footer className="border-t border-slate-950 bg-slate-950/80 py-8 text-center text-slate-500 text-xs mt-auto">
        <p>&copy; {new Date().getFullYear()} Forroflix. Todos os direitos reservados. Feito com paixão pelo Forró.</p>
      </footer>
    </div>
  );
}
