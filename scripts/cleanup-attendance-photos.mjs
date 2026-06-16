import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERRO: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  console.error('Crie um arquivo .env.local na raiz e adicione as variáveis.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUCKET_NAME = 'attendance-photos';

async function listAllFilesRecursively(folderPath = '') {
  const allFiles = [];
  
  const { data: files, error } = await supabase.storage.from(BUCKET_NAME).list(folderPath, {
    limit: 1000,
    search: ''
  });

  if (error) {
    throw error;
  }

  for (const file of files) {
    // metadata = null is typically a folder in Supabase storage
    const currentPath = folderPath ? `${folderPath}/${file.name}` : file.name;
    
    // As of recent supabase versions, folder has id=null and metadata=null
    // Sometimes it's just better to check if it has a mimetype or just try to list it
    if (!file.id && file.name !== '.emptyFolderPlaceholder') {
       // It's a folder
       const subFiles = await listAllFilesRecursively(currentPath);
       allFiles.push(...subFiles);
       // We can also add the folder itself if we want to delete it, though Supabase cleans up empty folders
    } else {
       // It's a file
       allFiles.push(currentPath);
    }
  }

  return allFiles;
}

async function cleanupBucket() {
  console.log(`Iniciando limpeza do bucket: ${BUCKET_NAME}`);
  
  try {
    const filePaths = await listAllFilesRecursively();

    if (filePaths.length === 0) {
      console.log('O bucket já está vazio ou nenhum arquivo foi encontrado.');
      return;
    }

    console.log(`Encontrados ${filePaths.length} arquivos totais (recursivamente). Deletando...`);

    // Batch delete in chunks of 100 to avoid limits
    const chunkSize = 100;
    let deletedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < filePaths.length; i += chunkSize) {
      const chunk = filePaths.slice(i, i + chunkSize);
      const { data, error: removeError } = await supabase.storage.from(BUCKET_NAME).remove(chunk);

      if (removeError) {
        console.error(`Erro ao deletar lote ${i/chunkSize + 1}:`, removeError);
        errorCount++;
      } else {
        deletedCount += data?.length || chunk.length;
      }
    }

    console.log(`Sucesso: ${deletedCount} arquivos deletados do bucket.`);
    if (errorCount > 0) {
      console.log(`Ocorreram erros em ${errorCount} lotes.`);
    }

  } catch (error) {
    console.error('Falha ao limpar o bucket:', error);
  }
}

cleanupBucket();
