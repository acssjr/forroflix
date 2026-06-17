-- Criar tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT CHECK(role IN ('student', 'admin')) DEFAULT 'student',
    subscription_active INTEGER DEFAULT 0, -- 0 = Inativo, 1 = Ativo
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de Cursos
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE NOT NULL,
    thumbnail_gradient TEXT DEFAULT 'from-orange-500 to-red-600',
    cover_vertical TEXT,
    cover_horizontal TEXT,
    cover_vertical_position TEXT DEFAULT '50% 50%',
    cover_horizontal_position TEXT DEFAULT '50% 50%',
    is_featured INTEGER DEFAULT 0,
    hide_title INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de Módulos
CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de Aulas
CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    module_id TEXT REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    video_id TEXT, -- ID do vídeo no Bunny Stream
    duration_seconds INTEGER DEFAULT 0,
    upload_status TEXT DEFAULT 'pending', -- 'pending', 'uploading', 'completed', 'failed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de Progresso das Aulas
CREATE TABLE IF NOT EXISTS progress (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
    completed INTEGER DEFAULT 0, -- 0 = Incompleto, 1 = Concluído
    watched_seconds INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- Criar Índices de Desempenho
CREATE INDEX IF NOT EXISTS idx_lessons_module_position ON lessons(module_id, position);
CREATE INDEX IF NOT EXISTS idx_modules_course_position ON modules(course_id, position);

