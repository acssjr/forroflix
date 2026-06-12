export interface Lesson {
  id: string;
  title: string;
  duration_seconds: number;
  video_id: string;
  position: number;
}

export interface Module {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
  thumbnail_gradient: string;
  modules: Module[];
}

export const MOCK_COURSES_DATA: Course[] = [
  {
    id: 'course-1',
    title: 'Forró Universitário - Do Zero ao Passo Básico',
    description: 'Aprenda os passos fundamentais do Forró Universitário para começar a dançar do absoluto zero.',
    slug: 'forro-universitario-basico',
    thumbnail_gradient: 'from-orange-500 to-red-600',
    modules: [
      {
        id: 'mod-1',
        title: 'Módulo 1: Primeiros Passos e Postura',
        position: 1,
        lessons: [
          {
            id: 'aula-1-1',
            title: '1. Postura, Abraço e Conexão',
            duration_seconds: 480,
            video_id: 'mock-video-1',
            position: 1
          },
          {
            id: 'aula-1-2',
            title: '2. O Passo Básico Lateral (2 para lá, 2 para cá)',
            duration_seconds: 600,
            video_id: 'mock-video-2',
            position: 2
          },
          {
            id: 'aula-1-3',
            title: '3. A Caminhada Frente e Trás',
            duration_seconds: 720,
            video_id: 'mock-video-3',
            position: 3
          }
        ]
      },
      {
        id: 'mod-2',
        title: 'Módulo 2: Introdução aos Giros',
        position: 2,
        lessons: [
          {
            id: 'aula-2-1',
            title: '4. Preparação e Giro Simples da Dama',
            duration_seconds: 900,
            video_id: 'mock-video-4',
            position: 1
          },
          {
            id: 'aula-2-2',
            title: '5. Abertura Simples',
            duration_seconds: 840,
            video_id: 'mock-video-5',
            position: 2
          }
        ]
      }
    ]
  },
  {
    id: 'course-2',
    title: 'Forró Pé de Serra - Giros e Condução',
    description: 'Domine a arte do cavalheiro e da dama: giros simultâneos, travas de braço e giros dinâmicos.',
    slug: 'forro-pe-de-serra-giros',
    thumbnail_gradient: 'from-violet-600 to-pink-500',
    modules: [
      {
        id: 'mod-3',
        title: 'Módulo 1: Giros Intermediários',
        position: 1,
        lessons: [
          {
            id: 'aula-3-1',
            title: '1. Giro do Cavalheiro',
            duration_seconds: 660,
            video_id: 'mock-video-6',
            position: 1
          },
          {
            id: 'aula-3-2',
            title: '2. Giro Simultâneo (Dama e Cavalheiro)',
            duration_seconds: 780,
            video_id: 'mock-video-7',
            position: 2
          }
        ]
      },
      {
        id: 'mod-4',
        title: 'Módulo 2: Travas e Abraços Dinâmicos',
        position: 2,
        lessons: [
          {
            id: 'aula-4-1',
            title: '3. Trava de Braço em Asa de Borboleta',
            duration_seconds: 820,
            video_id: 'mock-video-8',
            position: 1
          },
          {
            id: 'aula-4-2',
            title: '4. Saída do Abraço por Cima',
            duration_seconds: 900,
            video_id: 'mock-video-9',
            position: 2
          }
        ]
      }
    ]
  },
  {
    id: 'course-3',
    title: 'Estilo Roots - Musicalidade e Charme',
    description: 'Aprenda o autêntico Forró Roots: giros cruzados, passos arrastados e como interpretar o ritmo da sanfona e da zabumba.',
    slug: 'estilo-roots-musicalidade',
    thumbnail_gradient: 'from-blue-600 to-cyan-500',
    modules: [
      {
        id: 'mod-5',
        title: 'Módulo 1: O Balanço Roots',
        position: 1,
        lessons: [
          {
            id: 'aula-5-1',
            title: '1. O molejo e balanço no 1, 2, 3',
            duration_seconds: 960,
            video_id: 'mock-video-10',
            position: 1
          },
          {
            id: 'aula-5-2',
            title: '2. Passos Arrastados e Curvos',
            duration_seconds: 880,
            video_id: 'mock-video-11',
            position: 2
          }
        ]
      }
    ]
  }
];
