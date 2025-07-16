const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Función para generar embedding
async function generarEmbedding(texto) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texto
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generando embedding:', error);
    return null;
  }
}

// Función para procesar materiales de una semana
async function procesarMaterialesSemana(semanaPath, semanaNum) {
  const embeddings = [];
  
  try {
    // Leer el archivo principal de la semana
    const archivoPrincipal = path.join(semanaPath, `materiales_semana_${semanaNum.toString().padStart(2, '0')}.json`);
    if (fs.existsSync(archivoPrincipal)) {
      const material = JSON.parse(fs.readFileSync(archivoPrincipal, 'utf8'));
      
      // Crear embedding para el material principal
      const contenidoPrincipal = `Semana ${semanaNum}: ${material.titulo}\n\nDescripción: ${material.descripcion}\n\nPalabras clave: ${material.palabras_clave.join(', ')}\n\nContenido:\n${material.diapositivas.map(d => `Diapositiva ${d.numero}: ${d.titulo}\n${d.contenido}\nPuntos clave: ${d.puntos_clave.join(', ')}`).join('\n\n')}`;
      
      const embedding = await generarEmbedding(contenidoPrincipal);
      if (embedding) {
        embeddings.push({
          id: `material_semana_${semanaNum}`,
          contenido: contenidoPrincipal,
          embedding: embedding,
          fuente: `materiales_curso/semana_${semanaNum.toString().padStart(2, '0')}/materiales_semana_${semanaNum.toString().padStart(2, '0')}.json`,
          tipo: 'material_curso',
          semana: semanaNum,
          titulo: material.titulo
        });
      }
      
      // Procesar bloques adicionales si existen
      const archivos = fs.readdirSync(semanaPath);
      for (const archivo of archivos) {
        if (archivo.startsWith('bloque_') && archivo.endsWith('.json')) {
          const bloquePath = path.join(semanaPath, archivo);
          const bloque = JSON.parse(fs.readFileSync(bloquePath, 'utf8'));
          
          const contenidoBloque = `Bloque: ${bloque.titulo || archivo}\n\nContenido: ${JSON.stringify(bloque, null, 2)}`;
          const embeddingBloque = await generarEmbedding(contenidoBloque);
          
          if (embeddingBloque) {
            embeddings.push({
              id: `bloque_${archivo.replace('.json', '')}`,
              contenido: contenidoBloque,
              embedding: embeddingBloque,
              fuente: `materiales_curso/semana_${semanaNum.toString().padStart(2, '0')}/${archivo}`,
              tipo: 'bloque_material',
              semana: semanaNum
            });
          }
        }
      }
      
      // Procesar resumen si existe
      const resumenPath = path.join(semanaPath, `resumen_general_semana_${semanaNum.toString().padStart(2, '0')}.json`);
      if (fs.existsSync(resumenPath)) {
        const resumen = JSON.parse(fs.readFileSync(resumenPath, 'utf8'));
        const contenidoResumen = `Resumen Semana ${semanaNum}: ${JSON.stringify(resumen, null, 2)}`;
        const embeddingResumen = await generarEmbedding(contenidoResumen);
        
        if (embeddingResumen) {
          embeddings.push({
            id: `resumen_semana_${semanaNum}`,
            contenido: contenidoResumen,
            embedding: embeddingResumen,
            fuente: `materiales_curso/semana_${semanaNum.toString().padStart(2, '0')}/resumen_general_semana_${semanaNum.toString().padStart(2, '0')}.json`,
            tipo: 'resumen_semana',
            semana: semanaNum
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error procesando semana ${semanaNum}:`, error);
  }
  
  return embeddings;
}

// Función principal
async function generarEmbeddingsMateriales() {
  console.log('🚀 Iniciando generación de embeddings para materiales del curso...');
  
  const materialesPath = path.join(__dirname, 'src/db/materiales_curso');
  const embeddingsPath = path.join(__dirname, 'src/db/embeddings/embeddings_materiales_curso.json');
  
  let todosLosEmbeddings = [];
  
  // Procesar cada semana (1-15)
  for (let semana = 1; semana <= 15; semana++) {
    const semanaPath = path.join(materialesPath, `semana_${semana.toString().padStart(2, '0')}`);
    
    if (fs.existsSync(semanaPath)) {
      console.log(`📚 Procesando semana ${semana}...`);
      const embeddingsSemana = await procesarMaterialesSemana(semanaPath, semana);
      todosLosEmbeddings = todosLosEmbeddings.concat(embeddingsSemana);
      console.log(`✅ Semana ${semana}: ${embeddingsSemana.length} embeddings generados`);
    }
  }
  
  // Guardar todos los embeddings
  fs.writeFileSync(embeddingsPath, JSON.stringify(todosLosEmbeddings, null, 2));
  console.log(`💾 Embeddings guardados en: ${embeddingsPath}`);
  console.log(`📊 Total de embeddings generados: ${todosLosEmbeddings.length}`);
  
  return todosLosEmbeddings;
}

// Ejecutar el script
generarEmbeddingsMateriales().catch(console.error); 