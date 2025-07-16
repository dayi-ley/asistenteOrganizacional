const { manejarMensaje } = require('./src/handlers/ManejadorMensajes');

async function probarModoDocente() {
  const numeroDocente = '51994292015'; // Número del docente registrado
  const preguntasDocente = [
    "¿Qué curso enseño?",
    "¿Qué temas me toca enseñar hoy?",
    "¿En qué aula tengo clase?",
    "¿Cuál es mi horario de clases?",
    "¿Qué sección tengo a cargo?",
    "¿Cuántos estudiantes tengo en mi curso?",
    "¿Qué materiales necesito para la clase de hoy?",
    "¿En qué semestre estoy dictando el curso?"
  ];

  console.log('👨‍🏫 Probando modo docente...\n');

  for (const pregunta of preguntasDocente) {
    console.log(`❓ Pregunta del docente: ${pregunta}`);
    try {
      const respuesta = await manejarMensaje(numeroDocente, pregunta);
      console.log(`✅ Respuesta: ${respuesta}\n`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
}

probarModoDocente(); 