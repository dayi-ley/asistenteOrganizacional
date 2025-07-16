const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Configurar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generarEmbeddingsMallaCurricular() {
  try {
    console.log('🔄 Generando embeddings para la malla curricular...');
    
    // Cargar datos de cursos por semestre
    const cursosPath = path.join(__dirname, '../malla_curricular/CursosPorSemestre.json');
    const cursosData = JSON.parse(fs.readFileSync(cursosPath, 'utf8'));
    
    const embeddings = [];
    
    // Procesar cada semestre
    for (const semestre of cursosData.semestres) {
      console.log(`📚 Procesando semestre ${semestre.semestre}...`);
      
      // Crear texto descriptivo del semestre
      const semestreText = `Semestre ${semestre.semestre} - Total de créditos: ${semestre.total_creditos}. Cursos: ${semestre.cursos.map(curso => 
        `${curso.nombre} (${curso.creditos} créditos, tipo: ${curso.tipo}${curso.requisitos.length > 0 ? ', requisitos: ' + curso.requisitos.join(', ') : ''})`
      ).join('; ')}`;
      
      // Generar embedding para el semestre completo
      const semestreEmbedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: semestreText,
        encoding_format: "float"
      });
      
      embeddings.push({
        text: semestreText,
        embedding: semestreEmbedding.data[0].embedding,
        metadata: {
          tipo: 'semestre',
          semestre: semestre.semestre,
          total_creditos: semestre.total_creditos,
          num_cursos: semestre.cursos.length
        }
      });
      
      // Procesar cada curso individualmente
      for (const curso of semestre.cursos) {
        const cursoText = `Curso ${curso.numero}: ${curso.nombre}. Semestre: ${semestre.semestre}. Créditos: ${curso.creditos}. Tipo: ${curso.tipo}${curso.requisitos.length > 0 ? '. Requisitos: ' + curso.requisitos.join(', ') : ''}`;
        
        const cursoEmbedding = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: cursoText,
          encoding_format: "float"
        });
        
        embeddings.push({
          text: cursoText,
          embedding: cursoEmbedding.data[0].embedding,
          metadata: {
            tipo: 'curso',
            numero: curso.numero,
            nombre: curso.nombre,
            semestre: semestre.semestre,
            creditos: curso.creditos,
            tipo_curso: curso.tipo,
            requisitos: curso.requisitos
          }
        });
      }
    }
    
    // Guardar embeddings
    const outputPath = path.join(__dirname, 'malla_curricular_embeddings.json');
    fs.writeFileSync(outputPath, JSON.stringify(embeddings, null, 2));
    
    console.log(`✅ Embeddings generados exitosamente: ${embeddings.length} embeddings`);
    console.log(`📁 Guardado en: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error generando embeddings:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generarEmbeddingsMallaCurricular();
}

module.exports = { generarEmbeddingsMallaCurricular }; 