const fs = require('fs');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Carregar variáveis do .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
const apiKey = process.env.BUNNY_STREAM_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseName(name) {
  const match = name.match(/^(\d+)\s*[-_]?\s*(.*)$/);
  if (match) {
    return {
      position: parseInt(match[1], 10),
      title: match[2].trim()
    };
  }
  return {
    position: 99,
    title: name.trim()
  };
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function createVideoPlaceholder(title, libId, accessKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ title });
    const options = {
      hostname: 'video.bunnycdn.com',
      path: `/library/${libId}/videos`,
      method: 'POST',
      headers: {
        'AccessKey': accessKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Erro ao criar vídeo no Bunny: HTTP ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
}

function uploadVideoFile(filePath, libId, videoId, accessKey) {
  return new Promise((resolve, reject) => {
    const stats = fs.statSync(filePath);
    const options = {
      hostname: 'video.bunnycdn.com',
      path: `/library/${libId}/videos/${videoId}`,
      method: 'PUT',
      headers: {
        'AccessKey': accessKey,
        'Content-Type': 'application/octet-stream',
        'Content-Length': stats.size
      }
    };

    console.log(`[BUNNY] Iniciando upload do arquivo (${(stats.size / 1024 / 1024).toFixed(2)} MB)...`);

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Erro no upload Bunny: HTTP ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', err => reject(err));

    const readStream = fs.createReadStream(filePath);
    
    // Log de progresso simplificado
    let uploadedBytes = 0;
    readStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const progress = ((uploadedBytes / stats.size) * 100).toFixed(1);
      process.stdout.write(`\r[BUNNY] Progresso do Upload: ${progress}%`);
    });

    readStream.pipe(req);
  });
}

async function sync() {
  const videosDir = path.resolve(__dirname, '../videos');
  
  if (!fs.existsSync(videosDir)) {
    console.log(`\nCriando a pasta de entrada: "${videosDir}"`);
    fs.mkdirSync(videosDir);
    console.log('Por favor, coloque suas pastas de cursos dentro de "videos/" e execute o script novamente.');
    console.log('Estrutura sugerida:\n  videos/\n    01 - Curso de Forro Universitario/\n      01 - Modulo Basico/\n        01 - O Passo Basico.mp4');
    return;
  }

  const courseDirs = fs.readdirSync(videosDir).filter(f => fs.statSync(path.join(videosDir, f)).isDirectory());

  if (courseDirs.length === 0) {
    console.log('Nenhum curso encontrado na pasta "videos/". Insira uma pasta de curso para sincronizar.');
    return;
  }

  for (const courseDir of courseDirs) {
    const coursePath = path.join(videosDir, courseDir);
    const { title: courseTitle } = parseName(courseDir);
    const courseSlug = slugify(courseTitle);

    console.log(`\n==================================================`);
    console.log(`[CURSO] Sincronizando Curso: "${courseTitle}" (${courseSlug})`);
    
    // 1. Inserir ou buscar Curso no Supabase
    let { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('*')
      .eq('slug', courseSlug)
      .single();

    if (courseErr && courseErr.code !== 'PGRST116') { // PGRST116 = registro não encontrado
      console.error('[ERRO SUPABASE] Erro ao buscar curso:', courseErr.message);
      continue;
    }

    if (!course) {
      console.log(`[SUPABASE] Criando novo curso: "${courseTitle}"`);
      const { data: newCourse, error: createCourseErr } = await supabase
        .from('courses')
        .insert({ title: courseTitle, slug: courseSlug })
        .select()
        .single();

      if (createCourseErr) {
        console.error('[ERRO SUPABASE] Erro ao criar curso:', createCourseErr.message);
        continue;
      }
      course = newCourse;
    } else {
      console.log(`[SUPABASE] Curso já cadastrado no banco: "${courseTitle}"`);
    }

    // Varrer Módulos
    const moduleDirs = fs.readdirSync(coursePath).filter(f => fs.statSync(path.join(coursePath, f)).isDirectory());
    for (const moduleDir of moduleDirs) {
      const modulePath = path.join(coursePath, moduleDir);
      const { position: modPos, title: modTitle } = parseName(moduleDir);

      console.log(`  └─ [MÓDULO] "${modTitle}" (Posição: ${modPos})`);

      // 2. Inserir ou buscar Módulo no Supabase
      let { data: dbModule, error: modErr } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', course.id)
        .eq('title', modTitle)
        .single();

      if (modErr && modErr.code !== 'PGRST116') {
        console.error('    [ERRO SUPABASE] Erro ao buscar módulo:', modErr.message);
        continue;
      }

      if (!dbModule) {
        console.log(`    [SUPABASE] Criando novo módulo: "${modTitle}"`);
        const { data: newMod, error: createModErr } = await supabase
          .from('modules')
          .insert({ course_id: course.id, title: modTitle, position: modPos })
          .select()
          .single();

        if (createModErr) {
          console.error('    [ERRO SUPABASE] Erro ao criar módulo:', createModErr.message);
          continue;
        }
        dbModule = newMod;
      } else if (dbModule.position !== modPos) {
        // Atualizar posição se mudou
        await supabase.from('modules').update({ position: modPos }).eq('id', dbModule.id);
      }

      // Varrer Aulas (vídeos)
      const lessonFiles = fs.readdirSync(modulePath).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ['.mp4', '.mkv', '.mov', '.avi'].includes(ext);
      });

      for (const lessonFile of lessonFiles) {
        const lessonFilePath = path.join(modulePath, lessonFile);
        const { position: lesPos, title: lesTitle } = parseName(path.basename(lessonFile, path.extname(lessonFile)));

        console.log(`      └─ [AULA] "${lesTitle}" (Posição: ${lesPos})`);

        // 3. Verificar se aula já existe no banco
        let { data: dbLesson, error: lesErr } = await supabase
          .from('lessons')
          .select('*')
          .eq('module_id', dbModule.id)
          .eq('title', lesTitle)
          .single();

        if (lesErr && lesErr.code !== 'PGRST116') {
          console.error('        [ERRO SUPABASE] Erro ao buscar aula:', lesErr.message);
          continue;
        }

        if (dbLesson) {
          console.log(`        [SUPABASE] Aula já sincronizada.`);
          // Atualiza posição se necessário
          if (dbLesson.position !== lesPos) {
            await supabase.from('lessons').update({ position: lesPos }).eq('id', dbLesson.id);
          }
          continue;
        }

        // 4. Integração Bunny Stream se configurado, senão cria placeholder no banco sem video_id
        let videoId = null;

        if (libraryId && apiKey) {
          try {
            console.log(`        [BUNNY] Criando placeholder de vídeo para: "${lesTitle}"...`);
            const bunnyRes = await createVideoPlaceholder(lesTitle, libraryId, apiKey);
            videoId = bunnyRes.guid;
            console.log(`        [BUNNY] Vídeo criado com GUID: ${videoId}`);

            await uploadVideoFile(lessonFilePath, libraryId, videoId, apiKey);
            console.log(`\n        [BUNNY] Upload concluído com sucesso.`);
          } catch (bunnyErr) {
            console.error('\n        [ERRO BUNNY] Erro durante o fluxo Bunny:', bunnyErr.message);
            console.log('        Pulando upload do vídeo, criando registro apenas no banco local.');
          }
        } else {
          console.log('        [AVISO] Bunny Stream não configurado no .env.local. Criando registro local sem vídeo.');
        }

        // 5. Salvar lição no Supabase
        const { error: createLesErr } = await supabase
          .from('lessons')
          .insert({
            module_id: dbModule.id,
            title: lesTitle,
            position: lesPos,
            video_id: videoId
          });

        if (createLesErr) {
          console.error('        [ERRO SUPABASE] Erro ao criar aula:', createLesErr.message);
        } else {
          console.log(`        [SUPABASE] Aula gravada no banco.`);
        }
      }
    }
  }
  console.log('\nSincronização concluída com sucesso!');
}

sync().catch(console.error);
