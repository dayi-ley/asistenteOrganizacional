const { manejarMensaje } = require('./src/handlers/ManejadorMensajes');

async function probarPreguntasHorarios() {
  const preguntas = [
    "¿En qué ciclo se dicta el curso de Ingeniería de Sistemas de Información?",
    "¿Cuál es el código del curso de Ingeniería de Sistemas de Información?",
    "¿En qué semestre se dicta el curso de Ingeniería de Sistemas de Información?",
    "¿En qué sección está el curso de Ingeniería de Sistemas de Información?"
  ];

  console.log('🧪 Probando preguntas específicas sobre horarios...\n');

  for (const pregunta of preguntas) {
    console.log(`❓ Pregunta: ${pregunta}`);
    try {
      const respuesta = await manejarMensaje('51929486812', pregunta);
      console.log(`✅ Respuesta: ${respuesta}\n`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
}

probarPreguntasHorarios(); 