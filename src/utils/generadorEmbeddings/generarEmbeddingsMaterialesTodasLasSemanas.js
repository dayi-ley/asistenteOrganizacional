const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generarEmbedding(texto) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texto,
      encoding_format: 'float'
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ Error generando embedding:', error);
    throw error;
  }
}

async function procesarArchivoJSON(rutaArchivo, semana, nombreArchivo) {
  try {
    console.log(`\n➡️ Procesando archivo: ${rutaArchivo}`);
    const data = JSON.parse(fs.readFileSync(rutaArchivo, 'utf8'));
    const fragmentos = data.fragmentos || [];
    const embeddings = [];
    let count = 0;
    for (const frag of fragmentos) {
      const texto = frag.fragmento;
      const embedding = await generarEmbedding(texto);
      embeddings.push({
        semana: frag.semana,
        archivo: frag.archivo,
        pagina: frag.pagina,
        imagen: frag.imagen,
        ruta_pdf: frag.ruta_pdf,
        texto: texto,
        embedding: embedding
      });
      count++;
      console.log(`   ✅ Embedding generado para página ${frag.pagina} (${frag.archivo})`);
    }
    // Guardar embeddings
    const nombreSalida = `embeddings_material_${semana}_${nombreArchivo.replace(/\.json$/, '')}.json`;
    const rutaSalida = path.join(__dirname, '../../db/embeddings', nombreSalida);
    fs.writeFileSync(rutaSalida, JSON.stringify(embeddings, null, 2));
    console.log(`   💾 Embeddings guardados en: ${rutaSalida} (${count} fragmentos)`);
    return { archivo: rutaArchivo, count };
  } catch (error) {
    console.error(`❌ Error procesando archivo ${rutaArchivo}:`, error);
    return { archivo: rutaArchivo, count: 0, error: true };
  }
}

async function generarEmbeddingsTodasLasSemanas() {
  const baseDir = path.join(__dirname, '../../db/materiales_curso/estructurados');
  const semanas = fs.readdirSync(baseDir).filter(d => d.startsWith('semana_') && d !== 'semana_01');
  let totalArchivos = 0;
  let totalFragmentos = 0;
  console.log('🔎 Semanas a procesar:', semanas);
  for (const semana of semanas) {
    const semanaDir = path.join(baseDir, semana);
    const archivos = fs.readdirSync(semanaDir).filter(f => f.endsWith('.json'));
    console.log(`\n📁 Semana: ${semana} - Archivos: ${archivos.length}`);
    for (const archivo of archivos) {
      const rutaArchivo = path.join(semanaDir, archivo);
      const res = await procesarArchivoJSON(rutaArchivo, semana, archivo);
      totalArchivos++;
      totalFragmentos += res.count;
    }
  }
  console.log(`\n✅ Proceso finalizado. Archivos procesados: ${totalArchivos}, fragmentos totales: ${totalFragmentos}`);
}

if (require.main === module) {
  generarEmbeddingsTodasLasSemanas();
} 