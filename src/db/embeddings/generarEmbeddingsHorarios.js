require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Configurar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Función para generar embeddings
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float"
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generando embedding:', error);
    throw error;
  }
}

// Función para fragmentar y enriquecer los datos de horarios
function fragmentarDatosHorarios(datos) {
  const fragmentos = [];
  
  // Fragmento 1: Información general del curso de Ingeniería de Sistemas de Información
  const cursoSistemas = datos.cursos.find(curso => 
    curso.nombre_curso === "INGENIERÍA DE SISTEMAS DE INFORMACIÓN"
  );
  
  if (cursoSistemas) {
    fragmentos.push({
      id: "horarios_curso_sistemas_general",
      contenido: `Curso: INGENIERÍA DE SISTEMAS DE INFORMACIÓN
Código: ${cursoSistemas.codigo_curso}
Escuela: ${cursoSistemas.escuela_profesional}
Ciclo: ${cursoSistemas.ciclo}
Sección: ${cursoSistemas.seccion}
Docente: ${cursoSistemas.docente}
Semestre: ${cursoSistemas.semestre}
Total horas semanales: ${cursoSistemas.total_horas_semanales}
Horas teoría: ${cursoSistemas.total_horas_teoria}
Horas práctica: ${cursoSistemas.total_horas_practica}
Estado: ${cursoSistemas.estado}`,
      tipo: "informacion_general",
      preguntas_ejemplo: [
        "¿Quién es el docente del curso de Ingeniería de Sistemas de Información?",
        "¿Cuántas horas semanales tiene el curso de Ingeniería de Sistemas de Información?",
        "¿En qué ciclo se dicta el curso de Ingeniería de Sistemas de Información?",
        "¿Cuál es el código del curso de Ingeniería de Sistemas de Información?",
        "¿En qué semestre se dicta el curso de Ingeniería de Sistemas de Información?",
        "¿Cuántas horas de teoría y práctica tiene el curso de Ingeniería de Sistemas de Información?",
        "¿En qué sección está el curso de Ingeniería de Sistemas de Información?"
      ]
    });
  }
  
  // Fragmento 2: Horarios detallados del curso de Ingeniería de Sistemas de Información
  if (cursoSistemas && cursoSistemas.horarios) {
    const horariosTexto = cursoSistemas.horarios.map((horario, index) => 
      `${horario.dia} de ${horario.hora_inicio} a ${horario.hora_fin}, Aula ${horario.aula} (${horario.piso} piso), Sesión: ${horario.tipo_sesion}, Duración: ${horario.duracion_minutos} minutos`
    ).join('\n');
    
    fragmentos.push({
      id: "horarios_curso_sistemas_detalle",
      contenido: `Horarios del curso INGENIERÍA DE SISTEMAS DE INFORMACIÓN:
${horariosTexto}`,
      tipo: "horarios_detallados",
      preguntas_ejemplo: [
        "¿Qué días se dicta el curso de Ingeniería de Sistemas de Información?",
        "¿Cuáles son los horarios de teoría y práctica del curso de Ingeniería de Sistemas de Información?",
        "¿En qué aulas se dicta el curso de Ingeniería de Sistemas de Información?",
        "¿Cuánto dura cada sesión del curso de Ingeniería de Sistemas de Información?",
        "¿En qué piso están las aulas del curso de Ingeniería de Sistemas de Información?",
        "¿A qué hora empieza y termina la clase de teoría del curso de Ingeniería de Sistemas de Información?",
        "¿A qué hora empieza y termina la clase de práctica del curso de Ingeniería de Sistemas de Información?",
        "¿Qué tipo de sesión es cada clase del curso de Ingeniería de Sistemas de Información?"
      ]
    });
  }
  
  // Fragmento 3: Configuración general de horarios institucionales
  if (datos.configuracion_horarios) {
    const config = datos.configuracion_horarios;
    fragmentos.push({
      id: "configuracion_horarios_institucional",
      contenido: `Configuración de horarios institucional:
Días laborables: ${config.dias_laborables.join(', ')}
Horario institucional: ${config.horario_institucional.hora_inicio_jornada} a ${config.horario_institucional.hora_fin_jornada}
Duración bloque estándar: ${config.horario_institucional.duracion_bloque_estandar} minutos
Tipos de sesión: ${config.tipos_sesion.join(', ')}`,
      tipo: "configuracion_general",
      preguntas_ejemplo: [
        "¿Cuáles son los días laborables en la institución?",
        "¿Cuál es el horario institucional?",
        "¿Cuánto dura un bloque estándar de clase?",
        "¿Qué tipos de sesión existen?",
        "¿Qué días se pueden programar clases?",
        "¿Desde qué hora hasta qué hora funciona la institución?",
        "¿Qué tipos de sesiones se pueden realizar en la institución?"
      ]
    });
  }
  
  return fragmentos;
}

// Función principal
async function generarEmbeddingsHorarios() {
  try {
    console.log('🔄 Iniciando generación de embeddings para HorariosCursos...');
    
    // Leer el archivo de datos
    const rutaArchivo = path.join(__dirname, '../datos_operativos/HorariosCursos.json');
    const datos = JSON.parse(fs.readFileSync(rutaArchivo, 'utf8'));
    
    // Fragmentar los datos
    const fragmentos = fragmentarDatosHorarios(datos);
    console.log(`📝 Generados ${fragmentos.length} fragmentos de datos`);
    
    // Generar embeddings para cada fragmento
    const embeddings = [];
    
    for (const fragmento of fragmentos) {
      console.log(`🔍 Generando embedding para: ${fragmento.id}`);
      
      const embedding = await generateEmbedding(fragmento.contenido);
      
      embeddings.push({
        id: fragmento.id,
        contenido: fragmento.contenido,
        embedding: embedding,
        tipo: fragmento.tipo,
        preguntas_ejemplo: fragmento.preguntas_ejemplo,
        fuente: "HorariosCursos.json",
        timestamp: new Date().toISOString()
      });
    }
    
    // Guardar embeddings
    const rutaSalida = path.join(__dirname, 'embeddings_horarios.json');
    fs.writeFileSync(rutaSalida, JSON.stringify(embeddings, null, 2));
    
    console.log(`✅ Embeddings generados exitosamente: ${embeddings.length} fragmentos`);
    console.log(`📁 Guardado en: ${rutaSalida}`);
    
    // Mostrar resumen
    console.log('\n📊 Resumen de fragmentos generados:');
    fragmentos.forEach(f => {
      console.log(`  - ${f.id} (${f.tipo}): ${f.preguntas_ejemplo.length} preguntas ejemplo`);
    });
    
  } catch (error) {
    console.error('❌ Error generando embeddings:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generarEmbeddingsHorarios();
}

module.exports = {
  generarEmbeddingsHorarios,
  fragmentarDatosHorarios
}; 