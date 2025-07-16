const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Cargar variables de entorno
require('dotenv').config();

// Configurar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Función para generar embeddings
async function generarEmbedding(texto) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texto,
      encoding_format: "float"
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generando embedding:', error);
    throw error;
  }
}

// Función para crear embeddings del Syllabus de Evaluación
async function generarEmbeddingsEvaluacion() {
  try {
    console.log('🔄 Generando embeddings para SyllabusEvaluacion.json...');
    
    // Leer el archivo JSON
    const rutaArchivo = path.join(__dirname, 'db', 'syllabus', 'SyllabusEvaluacion.json');
    const datosEvaluacion = JSON.parse(fs.readFileSync(rutaArchivo, 'utf8'));
    
    const embeddings = [];
    
    // 1. Metodología - Estrategias de Aprendizaje
    const estrategiasAprendizaje = datosEvaluacion.metodologia.estrategias_aprendizaje.join(', ');
    const textoAprendizaje = `Estrategias de aprendizaje del curso: ${estrategiasAprendizaje}`;
    const embeddingAprendizaje = await generarEmbedding(textoAprendizaje);
    embeddings.push({
      texto: textoAprendizaje,
      embedding: embeddingAprendizaje,
      tipo: 'metodologia_aprendizaje'
    });
    
    // 2. Metodología - Estrategias de Enseñanza
    const estrategiasEnsenanza = datosEvaluacion.metodologia.estrategias_ensenanza.join(', ');
    const textoEnsenanza = `Estrategias de enseñanza del curso: ${estrategiasEnsenanza}`;
    const embeddingEnsenanza = await generarEmbedding(textoEnsenanza);
    embeddings.push({
      texto: textoEnsenanza,
      embedding: embeddingEnsenanza,
      tipo: 'metodologia_ensenanza'
    });
    
    // 3. Metodología - Línea de Investigación
    const lineaInvestigacion = datosEvaluacion.metodologia.linea_investigacion.join(', ');
    const textoInvestigacion = `Líneas de investigación del curso: ${lineaInvestigacion}`;
    const embeddingInvestigacion = await generarEmbedding(textoInvestigacion);
    embeddings.push({
      texto: textoInvestigacion,
      embedding: embeddingInvestigacion,
      tipo: 'metodologia_investigacion'
    });
    
    // 4. Reglamento de Evaluación
    const reglamento = datosEvaluacion.evaluacion.reglamento;
    const textoReglamento = `Reglamento de evaluación: Escala de ${reglamento.escala}, nota mínima ${reglamento.nota_minima}, máximo ${reglamento.inasistencias_maximas}`;
    const embeddingReglamento = await generarEmbedding(textoReglamento);
    embeddings.push({
      texto: textoReglamento,
      embedding: embeddingReglamento,
      tipo: 'evaluacion_reglamento'
    });
    
    // 5. Ponderaciones de Evaluación
    const ponderaciones = datosEvaluacion.evaluacion.ponderaciones;
    const textoPonderaciones = `Ponderaciones de evaluación: ${ponderaciones.map(p => `${p.descripcion} (${p.codigo}): ${p.porcentaje}%`).join(', ')}`;
    const embeddingPonderaciones = await generarEmbedding(textoPonderaciones);
    embeddings.push({
      texto: textoPonderaciones,
      embedding: embeddingPonderaciones,
      tipo: 'evaluacion_ponderaciones'
    });
    
    // 6. Fórmula de Evaluación
    const formula = datosEvaluacion.evaluacion.formula;
    const textoFormula = `Fórmula de evaluación: ${formula}`;
    const embeddingFormula = await generarEmbedding(textoFormula);
    embeddings.push({
      texto: textoFormula,
      embedding: embeddingFormula,
      tipo: 'evaluacion_formula'
    });
    
    // 7. Fechas de Evaluaciones
    const fechasEvaluaciones = datosEvaluacion.evaluacion.fechas_evaluaciones;
    const textoFechas = `Fechas de evaluaciones: Examen parcial semana ${fechasEvaluaciones.examen_parcial.semana} (${fechasEvaluaciones.examen_parcial.fecha}) unidades ${fechasEvaluaciones.examen_parcial.unidades}, Examen final semana ${fechasEvaluaciones.examen_final.semana} (${fechasEvaluaciones.examen_final.fecha}) unidades ${fechasEvaluaciones.examen_final.unidades}`;
    const embeddingFechas = await generarEmbedding(textoFechas);
    embeddings.push({
      texto: textoFechas,
      embedding: embeddingFechas,
      tipo: 'evaluacion_fechas'
    });
    
    // 8. Información General de Evaluación
    const textoGeneral = `Información general de evaluación del curso: El curso utiliza una escala de 1 a 20 con nota mínima de 11. Las evaluaciones incluyen evaluación parcial (30%), evaluación final (30%) y trabajos académicos (40%). El examen parcial se realiza en la semana 8 cubriendo las unidades 1 y 2, y el examen final en la semana 16 cubriendo las unidades 3 y 4.`;
    const embeddingGeneral = await generarEmbedding(textoGeneral);
    embeddings.push({
      texto: textoGeneral,
      embedding: embeddingGeneral,
      tipo: 'evaluacion_general'
    });
    
    // Guardar embeddings
    const rutaEmbeddings = path.join(__dirname, 'db', 'embeddings', 'syllabus_evaluacion_embeddings.json');
    fs.writeFileSync(rutaEmbeddings, JSON.stringify(embeddings, null, 2));
    
    console.log(`✅ Embeddings generados exitosamente: ${embeddings.length} embeddings`);
    console.log(`📁 Guardados en: ${rutaEmbeddings}`);
    
    // Mostrar resumen
    console.log('\n📊 Resumen de embeddings generados:');
    embeddings.forEach((item, index) => {
      console.log(`${index + 1}. ${item.tipo}: ${item.texto.substring(0, 80)}...`);
    });
    
  } catch (error) {
    console.error('❌ Error generando embeddings:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generarEmbeddingsEvaluacion();
}

module.exports = { generarEmbeddingsEvaluacion }; 