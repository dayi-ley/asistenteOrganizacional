const { buscarFragmentosRelevantes } = require('./src/utils/busquedaSemantica');

async function testPerfilAsistente() {
  console.log('🧪 Probando embeddings del perfil del asistente...\n');
  
  const preguntas = [
    '¿Qué significa tu nombre ISIUX?',
    '¿Qué significa ISIUX?',
    '¿Por qué te llamas ISIUX?',
    '¿Cómo te llamas?',
    '¿Quién eres?',
    '¿Qué puedes hacer?',
    '¿Para qué sirves?',
    '¿Eres un humano?',
    '¿Cómo aprendes?',
    '¿Tienes emociones?'
  ];
  
  for (const pregunta of preguntas) {
    console.log(`\n📝 Pregunta: "${pregunta}"`);
    try {
      const fragmentos = await buscarFragmentosRelevantes(pregunta, null, 3);
      console.log(`📊 Fragmentos encontrados: ${fragmentos.length}`);
      
      if (fragmentos.length > 0) {
        console.log(`🎯 Mejor similitud: ${fragmentos[0].similitud.toFixed(4)}`);
        console.log(`📄 Fuente: ${fragmentos[0].fuente || 'sin_fuente'}`);
        console.log(`📝 Texto: "${fragmentos[0].texto.substring(0, 150)}..."`);
        
        // Verificar si es del perfil del asistente
        if (fragmentos[0].fuente === 'PerfilAsistente.json') {
          console.log(`✅ Fragmento del perfil del asistente encontrado`);
        } else {
          console.log(`❌ Fragmento NO es del perfil del asistente`);
        }
      } else {
        console.log(`❌ No se encontraron fragmentos`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

testPerfilAsistente().catch(console.error); 