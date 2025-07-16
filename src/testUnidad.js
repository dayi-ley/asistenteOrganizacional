const { buscarInformacionUnidad } = require('./utils/busquedaSemantica');

// Pruebas de diferentes formatos de preguntas sobre unidades
const preguntasPrueba = [
  "¿Qué temas se ven en la unidad 3?",
  "Temas de la unidad 1",
  "¿Cuáles son los contenidos de la unidad 2?",
  "unidad 4 temas",
  "¿Qué se ve en la unidad 5?", // Esta no debería existir
  "Hola, ¿cómo estás?", // Esta no debería ser detectada como unidad
  "¿Cuáles son los temas de la unidad 3 del curso?"
];

console.log('🧪 Probando detección de consultas sobre unidades...\n');

preguntasPrueba.forEach((pregunta, index) => {
  console.log(`\n--- Prueba ${index + 1} ---`);
  console.log(`Pregunta: "${pregunta}"`);
  
  const resultado = buscarInformacionUnidad(pregunta);
  
  if (resultado) {
    if (resultado.error) {
      console.log(`❌ Error: ${resultado.error}`);
    } else {
      console.log(`✅ Unidad detectada: ${resultado.numeroUnidad}`);
      console.log(`📚 Título: ${resultado.unidad.titulo}`);
      console.log(`🎯 Logro: ${resultado.unidad.logro_aprendizaje}`);
      console.log(`📅 Semanas: ${resultado.unidad.semanas.length}`);
      
      // Mostrar temas de las primeras 2 semanas como ejemplo
      console.log('\n📋 Temas de las primeras semanas:');
      resultado.unidad.semanas.slice(0, 2).forEach(semana => {
        console.log(`  Semana ${semana.semana}: ${semana.contenido_tematico}`);
      });
    }
  } else {
    console.log('❌ No detectada como consulta de unidad');
  }
});

console.log('\n✅ Pruebas completadas'); 