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

// Función para crear embeddings cortos y directos
async function generarEmbeddingsCortos() {
  try {
    console.log('🔄 Generando embeddings cortos y directos...');
    
    const embeddingsCortos = [];
    
    // 1. Número de unidades
    const textoUnidades = "El curso tiene 4 unidades.";
    const embeddingUnidades = await generarEmbedding(textoUnidades);
    embeddingsCortos.push({
      texto: textoUnidades,
      embedding: embeddingUnidades,
      tipo: 'resumen_unidades_corto'
    });
    
    // 2. Escala de notas
    const textoEscala = "La escala de notas es de 1 a 20.";
    const embeddingEscala = await generarEmbedding(textoEscala);
    embeddingsCortos.push({
      texto: textoEscala,
      embedding: embeddingEscala,
      tipo: 'escala_notas_corto'
    });
    
    // 3. Nota mínima
    const textoNotaMinima = "La nota mínima para aprobar es 11.";
    const embeddingNotaMinima = await generarEmbedding(textoNotaMinima);
    embeddingsCortos.push({
      texto: textoNotaMinima,
      embedding: embeddingNotaMinima,
      tipo: 'nota_minima_corto'
    });
    
    // 4. Examen parcial
    const textoParcial = "El examen parcial es en la semana 8.";
    const embeddingParcial = await generarEmbedding(textoParcial);
    embeddingsCortos.push({
      texto: textoParcial,
      embedding: embeddingParcial,
      tipo: 'examen_parcial_corto'
    });
    
    // 5. Examen final
    const textoFinal = "El examen final es en la semana 16.";
    const embeddingFinal = await generarEmbedding(textoFinal);
    embeddingsCortos.push({
      texto: textoFinal,
      embedding: embeddingFinal,
      tipo: 'examen_final_corto'
    });
    
    // 6. Ponderaciones
    const textoPonderaciones = "Las ponderaciones son: EP 30%, EF 30%, TA 40%.";
    const embeddingPonderaciones = await generarEmbedding(textoPonderaciones);
    embeddingsCortos.push({
      texto: textoPonderaciones,
      embedding: embeddingPonderaciones,
      tipo: 'ponderaciones_corto'
    });
    
    // 7. Fórmula de evaluación
    const textoFormula = "La fórmula es: NF = (EP * 30%) + (EF * 30%) + (TA * 40%).";
    const embeddingFormula = await generarEmbedding(textoFormula);
    embeddingsCortos.push({
      texto: textoFormula,
      embedding: embeddingFormula,
      tipo: 'formula_corto'
    });
    
    // 8. Inasistencias
    const textoInasistencias = "El máximo de inasistencias es 30%.";
    const embeddingInasistencias = await generarEmbedding(textoInasistencias);
    embeddingsCortos.push({
      texto: textoInasistencias,
      embedding: embeddingInasistencias,
      tipo: 'inasistencias_corto'
    });
    
    // Leer el archivo de embeddings general existente
    const rutaEmbeddingsGeneral = path.join(__dirname, 'db', 'embeddings', 'embeddings_syllabus_general.json');
    let embeddingsExistentes = [];
    
    if (fs.existsSync(rutaEmbeddingsGeneral)) {
      embeddingsExistentes = JSON.parse(fs.readFileSync(rutaEmbeddingsGeneral, 'utf8'));
      console.log(`📖 Embeddings existentes cargados: ${embeddingsExistentes.length}`);
    }
    
    // Agregar los nuevos embeddings cortos al final
    const embeddingsCompletos = [...embeddingsExistentes, ...embeddingsCortos];
    
    // Guardar el archivo actualizado
    fs.writeFileSync(rutaEmbeddingsGeneral, JSON.stringify(embeddingsCompletos, null, 2));
    
    console.log(`✅ Embeddings cortos generados exitosamente: ${embeddingsCortos.length} embeddings`);
    console.log(`📁 Archivo actualizado: ${rutaEmbeddingsGeneral}`);
    console.log(`📊 Total de embeddings en el archivo: ${embeddingsCompletos.length}`);
    
    // Mostrar resumen
    console.log('\n📋 Resumen de embeddings cortos agregados:');
    embeddingsCortos.forEach((item, index) => {
      console.log(`${index + 1}. ${item.tipo}: "${item.texto}"`);
    });
    
  } catch (error) {
    console.error('❌ Error generando embeddings cortos:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generarEmbeddingsCortos();
}

module.exports = { generarEmbeddingsCortos }; 