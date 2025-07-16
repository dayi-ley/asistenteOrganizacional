const { buscarFragmentosRelevantes } = require('./utils/busquedaSemantica');

async function testEmbeddingsCortos() {
  console.log('🧪 Probando embeddings cortos...\n');
  
  const preguntas = [
    '¿Cuántas unidades tiene el curso?',
    '¿Cuál es la escala de notas?',
    '¿Cuál es la nota mínima?',
    '¿Cuándo es el examen parcial?',
    '¿Cuándo es el examen final?',
    '¿Cuáles son las ponderaciones?',
    '¿Cuál es la fórmula de evaluación?',
    '¿Cuántas inasistencias puedo tener?'
  ];
  
  for (const pregunta of preguntas) {
    console.log(`\n📝 Pregunta: "${pregunta}"`);
    try {
      const fragmentos = await buscarFragmentosRelevantes(pregunta, null, 5);
      console.log(`📊 Fragmentos encontrados: ${fragmentos.length}`);
      
      // Buscar embeddings cortos específicos
      const embeddingCorto = fragmentos.find(f => f.tipo && f.tipo.includes('_corto'));
      
      if (embeddingCorto) {
        console.log(`✅ Encontrado embedding corto:`);
        console.log(`   Tipo: ${embeddingCorto.tipo}`);
        console.log(`   Similitud: ${embeddingCorto.similitud.toFixed(4)}`);
        console.log(`   Texto: "${embeddingCorto.texto}"`);
      } else {
        console.log(`❌ No se encontró embedding corto específico`);
        console.log(`🎯 Mejor similitud: ${fragmentos[0]?.similitud.toFixed(4)}`);
        console.log(`   Texto: "${fragmentos[0]?.texto.substring(0, 80)}..."`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

testEmbeddingsCortos(); 