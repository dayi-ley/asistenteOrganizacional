const { manejarMensaje } = require('./handlers/ManejadorMensajes');

// Simular un número de usuario registrado (usar uno que exista en tu base de datos)
const numeroUsuario = '51929486812'; // Ajusta este número según tus datos

async function probarManejador() {
  console.log('🧪 Probando manejador de mensajes...\n');
  
  const preguntasPrueba = [
    "¿Qué temas se ven en la unidad 3?",
    "Temas de la unidad 1", 
    "¿Cuáles son los contenidos de la unidad 2?",
    "¿Qué se ve en la unidad 5?", // Esta debería dar error
    "Hola", // Saludo personalizado
    "¿Qué es un sistema de información?" // Consulta general
  ];

  for (let i = 0; i < preguntasPrueba.length; i++) {
    const pregunta = preguntasPrueba[i];
    console.log(`\n--- Prueba ${i + 1} ---`);
    console.log(`Pregunta: "${pregunta}"`);
    
    try {
      const respuesta = await manejarMensaje(numeroUsuario, pregunta);
      console.log(`Respuesta:\n${respuesta}`);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

probarManejador().catch(console.error); 