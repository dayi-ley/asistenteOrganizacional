const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const syllabusGeneralPath = path.join(__dirname, '../syllabus/SyllabusGeneral.json');
const syllabusUnidadesPath = path.join(__dirname, '../syllabus/SyllabusUnidades.json');
const embeddingsPath = path.join(__dirname, 'embeddings_syllabus_general.json');

// Leer archivos
const syllabusGeneral = JSON.parse(fs.readFileSync(syllabusGeneralPath, 'utf-8'));
const syllabusUnidades = JSON.parse(fs.readFileSync(syllabusUnidadesPath, 'utf-8'));
const unidades = syllabusUnidades.unidades || syllabusUnidades;

// Extraer fragmentos globales
const fragmentos = [];

// 1. Resumen general del sílabo
if (syllabusGeneral.resumen) {
  fragmentos.push({ tipo: 'resumen_general', texto: syllabusGeneral.resumen });
}

// 2. Listado de unidades
const listadoUnidades = unidades.map(u => `Unidad ${u.id}: ${u.titulo}`).join('. ');
fragmentos.push({ tipo: 'listado_unidades', texto: `El curso tiene ${unidades.length} unidades: ${listadoUnidades}.` });

// 3. Estructura: semanas por unidad
for (const unidad of unidades) {
  if (unidad.semanas && unidad.semanas.length > 0) {
    const semanas = unidad.semanas.map(s => s.semana).join(', ');
    fragmentos.push({
      tipo: 'estructura_unidad',
      texto: `La unidad ${unidad.id} (${unidad.titulo}) abarca las semanas ${semanas}.`
    });
  }
}

// 4. Otros campos globales relevantes
if (syllabusGeneral.objetivos) {
  fragmentos.push({ tipo: 'objetivos', texto: `Objetivos del curso: ${syllabusGeneral.objetivos}` });
}
if (syllabusGeneral.competencias) {
  fragmentos.push({ tipo: 'competencias', texto: `Competencias del curso: ${syllabusGeneral.competencias}` });
}

async function generarEmbeddings() {
  const resultados = [];
  for (const frag of fragmentos) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: frag.texto
    });
    resultados.push({
      ...frag,
      embedding: response.data[0].embedding
    });
    console.log(`✅ Embedding generado para fragmento: ${frag.tipo}`);
  }
  fs.writeFileSync(embeddingsPath, JSON.stringify(resultados, null, 2), 'utf-8');
  console.log(`\n🎉 Embeddings generales guardados en ${embeddingsPath}`);
}

generarEmbeddings().catch(err => {
  console.error('Error generando embeddings generales:', err);
}); 