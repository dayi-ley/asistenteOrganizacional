const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ruta a las unidades del sílabo
const syllabusPath = path.join(__dirname, '../syllabus/SyllabusUnidades.json');
const embeddingsPath = path.join(__dirname, 'embeddings_unidades.json');

// Leer las unidades
const syllabusData = JSON.parse(fs.readFileSync(syllabusPath, 'utf-8'));
const unidades = syllabusData.unidades || syllabusData;

async function generarEmbeddings() {
  const resultados = [];
  for (const unidad of unidades) {
    const semanas = unidad.semanas || [];
    for (const semana of semanas) {
      // Construir el texto a embeddar con toda la información relevante
      const sesionesTexto = (semana.sesiones || []).join('; ');
      const texto = `Unidad ${unidad.id}: ${unidad.titulo}. Semana ${semana.semana}. Fechas: ${semana.fecha_inicio} a ${semana.fecha_fin}. Contenido temático: ${semana.contenido_tematico}. Sesiones: ${sesionesTexto}. Evidencia: ${semana.evidencia || ''}`;
      // Generar embedding
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: texto
      });
      resultados.push({
        unidad_id: unidad.id,
        unidad_titulo: unidad.titulo,
        semana: semana.semana,
        fecha_inicio: semana.fecha_inicio,
        fecha_fin: semana.fecha_fin,
        contenido_tematico: semana.contenido_tematico,
        sesiones: semana.sesiones,
        evidencia: semana.evidencia,
        texto,
        embedding: response.data[0].embedding
      });
      console.log(`✅ Embedding generado para Unidad ${unidad.id} - Semana ${semana.semana}`);
    }
  }
  // Guardar resultados
  fs.writeFileSync(embeddingsPath, JSON.stringify(resultados, null, 2), 'utf-8');
  console.log(`\n🎉 Embeddings granulares guardados en ${embeddingsPath}`);
}

generarEmbeddings().catch(err => {
  console.error('Error generando embeddings:', err);
}); 