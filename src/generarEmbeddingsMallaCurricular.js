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

// Función para crear embeddings de la malla curricular
async function generarEmbeddingsMallaCurricular() {
  try {
    console.log('🔄 Generando embeddings para la malla curricular...');
    
    const embeddings = [];
    
    // 1. Información General de la Malla
    const infoGeneral = JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'malla_curricular', 'InformacionGeneral.json'), 'utf8'));
    
    const textoInfoGeneral = `Información general de la malla curricular: ${infoGeneral.titulo}, ${infoGeneral.subtitulo}. Duración: ${infoGeneral.duracion_en_semestres} semestres, ${infoGeneral.total_asignaturas} asignaturas, ${infoGeneral.total_creditos} créditos totales. Escuela: ${infoGeneral.escuela_profesional}, Facultad: ${infoGeneral.facultad}, Plan de estudios: ${infoGeneral.plan_estudios}, Estado: ${infoGeneral.estado}.`;
    const embeddingInfoGeneral = await generarEmbedding(textoInfoGeneral);
    embeddings.push({
      texto: textoInfoGeneral,
      embedding: embeddingInfoGeneral,
      tipo: 'malla_info_general'
    });
    
    // 2. Estructura de Créditos
    const estructuraCreditos = infoGeneral.estructura_creditos;
    const textoEstructura = `Estructura de créditos de la malla: Formación general (${estructuraCreditos.formacion_general}), Formación específica (${estructuraCreditos.formacion_especifica}), Formación electiva (${estructuraCreditos.formacion_electiva}), Prácticas preprofesionales (${estructuraCreditos.practicas_preprofesionales}).`;
    const embeddingEstructura = await generarEmbedding(textoEstructura);
    embeddings.push({
      texto: textoEstructura,
      embedding: embeddingEstructura,
      tipo: 'malla_estructura_creditos'
    });
    
    // 3. Cursos por Semestre
    const cursosPorSemestre = JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'malla_curricular', 'CursosPorSemestre.json'), 'utf8'));
    
    // Generar embeddings por semestre
    for (const semestre of cursosPorSemestre.semestres) {
      const cursosTexto = semestre.cursos.map(curso => 
        `${curso.nombre} (${curso.creditos} créditos${curso.requisitos.length > 0 ? ', requisitos: ' + curso.requisitos.join(', ') : ''})`
      ).join(', ');
      
      const textoSemestre = `Semestre ${semestre.semestre}: ${semestre.total_creditos} créditos totales. Cursos: ${cursosTexto}.`;
      const embeddingSemestre = await generarEmbedding(textoSemestre);
      embeddings.push({
        texto: textoSemestre,
        embedding: embeddingSemestre,
        tipo: `malla_semestre_${semestre.semestre}`
      });
    }
    
    // 4. Información general de cursos por semestre
    const textoGeneralCursos = `La malla curricular tiene ${cursosPorSemestre.semestres.length} semestres con un total de ${cursosPorSemestre.semestres.reduce((total, sem) => total + sem.total_creditos, 0)} créditos distribuidos en ${cursosPorSemestre.semestres.reduce((total, sem) => total + sem.cursos.length, 0)} cursos.`;
    const embeddingGeneralCursos = await generarEmbedding(textoGeneralCursos);
    embeddings.push({
      texto: textoGeneralCursos,
      embedding: embeddingGeneralCursos,
      tipo: 'malla_general_cursos'
    });
    
    // 5. Cursos Electivos
    // (Eliminado: generación de embeddings a partir de CursosElectivos.json porque el archivo ya no existe y la información relevante está en el fragmento enriquecido)
    
    // 6. Información general de electivos
    // (Eliminado: generación de embeddings a partir de CursosElectivos.json)
    
    // 7. Relaciones de Requisitos
    const relacionesRequisitos = JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'malla_curricular', 'RelacionesRequisitos.json'), 'utf8'));
    
    // Estadísticas de requisitos
    const estadisticas = relacionesRequisitos.estadisticas;
    const textoEstadisticas = `Estadísticas de requisitos: ${estadisticas.total_cursos_con_prerrequisitos} cursos con prerrequisitos, ${estadisticas.total_cursos_sin_prerrequisitos} cursos sin prerrequisitos. Cursos con más prerrequisitos: ${estadisticas.cursos_con_mas_prerrequisitos.map(c => `${c.nombre} (${c.prerrequisitos})`).join(', ')}.`;
    const embeddingEstadisticas = await generarEmbedding(textoEstadisticas);
    embeddings.push({
      texto: textoEstadisticas,
      embedding: embeddingEstadisticas,
      tipo: 'malla_estadisticas_requisitos'
    });
    
    // 8. Cursos más requeridos
    const cursosRequeridos = estadisticas.cursos_requeridos_por_mas_cursos;
    const textoCursosRequeridos = `Cursos requeridos por más cursos: ${cursosRequeridos.map(c => `${c.nombre} (requerido por ${c.requerido_por} cursos)`).join(', ')}.`;
    const embeddingCursosRequeridos = await generarEmbedding(textoCursosRequeridos);
    embeddings.push({
      texto: textoCursosRequeridos,
      embedding: embeddingCursosRequeridos,
      tipo: 'malla_cursos_requeridos'
    });
    
    // 9. Información general de requisitos
    const textoGeneralRequisitos = `Sistema de requisitos de la malla: ${estadisticas.total_cursos_con_prerrequisitos} cursos tienen prerrequisitos, ${estadisticas.total_cursos_sin_prerrequisitos} cursos no tienen prerrequisitos. Los cursos más fundamentales son requeridos por múltiples cursos posteriores.`;
    const embeddingGeneralRequisitos = await generarEmbedding(textoGeneralRequisitos);
    embeddings.push({
      texto: textoGeneralRequisitos,
      embedding: embeddingGeneralRequisitos,
      tipo: 'malla_general_requisitos'
    });
    
    // FRAGMENTOS ENRIQUECIDOS PARA COBERTURA SEMÁNTICA
    // 0. Electivos
    const fragmentoElectivos = `Los cursos electivos de la carrera se llevan en los semestres 5, 6 y 7. En cada uno de estos semestres, el estudiante debe cursar un electivo, que suele ser asignado por la facultad. Ejemplo de preguntas: ¿En qué semestre se llevan los electivos? ¿Cuándo se dictan los cursos electivos? semestre donde se lleva electivo, ¿En qué ciclo se cursan los electivos?, ¿Cuántos electivos hay y cuándo se llevan?`;
    const embeddingFragmentoElectivos = await generarEmbedding(fragmentoElectivos);
    embeddings.push({
      texto: fragmentoElectivos,
      embedding: embeddingFragmentoElectivos,
      tipo: 'enriquecido_electivos'
    });

    // 0.1 Créditos totales y estructura
    const fragmentoCreditos = `La carrera de Ingeniería Informática tiene un total de ${infoGeneral.total_creditos} créditos, distribuidos en 10 semestres. Ejemplo de preguntas: ¿Cuántos créditos tiene la carrera? ¿Cuál es el total de créditos? créditos totales de la carrera, ¿Cuántos créditos se necesitan para egresar?`;
    const embeddingFragmentoCreditos = await generarEmbedding(fragmentoCreditos);
    embeddings.push({
      texto: fragmentoCreditos,
      embedding: embeddingFragmentoCreditos,
      tipo: 'enriquecido_creditos'
    });

    // 0.2 Avance y duración
    const fragmentoAvance = `La malla curricular está organizada en 10 semestres. El avance típico es de un semestre por ciclo académico. Ejemplo de preguntas: ¿Cuántos semestres dura la carrera? ¿Cuánto dura la carrera? duración de la carrera, ¿En cuántos años se termina la carrera?`;
    const embeddingFragmentoAvance = await generarEmbedding(fragmentoAvance);
    embeddings.push({
      texto: fragmentoAvance,
      embedding: embeddingFragmentoAvance,
      tipo: 'enriquecido_avance'
    });

    // 0.3 Requisitos y dependencias
    const fragmentoRequisitos = `Algunos cursos tienen prerrequisitos, es decir, requieren haber aprobado otros cursos antes de poder llevarlos. Ejemplo de preguntas: ¿Qué cursos son requisitos para X? ¿Qué cursos requieren X como prerrequisito? cursos que dependen de X, ¿Qué cursos puedo llevar después de aprobar X?`;
    const embeddingFragmentoRequisitos = await generarEmbedding(fragmentoRequisitos);
    embeddings.push({
      texto: fragmentoRequisitos,
      embedding: embeddingFragmentoRequisitos,
      tipo: 'enriquecido_requisitos'
    });

    // 0.4 Estructura de la malla
    const fragmentoEstructura = `La malla curricular está compuesta por cursos obligatorios, electivos y prácticas preprofesionales. Ejemplo de preguntas: ¿Cómo está estructurada la malla curricular? tipos de cursos en la malla, ¿Qué tipos de cursos hay? estructura de la malla curricular.`;
    const embeddingFragmentoEstructura = await generarEmbedding(fragmentoEstructura);
    embeddings.push({
      texto: fragmentoEstructura,
      embedding: embeddingFragmentoEstructura,
      tipo: 'enriquecido_estructura'
    });
    
    // Guardar embeddings
    const rutaEmbeddings = path.join(__dirname, 'db', 'embeddings', 'malla_curricular_embeddings.json');
    fs.writeFileSync(rutaEmbeddings, JSON.stringify(embeddings, null, 2));
    
    console.log(`✅ Embeddings de malla curricular generados exitosamente: ${embeddings.length} embeddings`);
    console.log(`📁 Guardados en: ${rutaEmbeddings}`);
    
    // Mostrar resumen
    console.log('\n📊 Resumen de embeddings generados:');
    console.log(`1. Información general de la malla`);
    console.log(`2. Estructura de créditos`);
    console.log(`3. Cursos por semestre (${cursosPorSemestre.semestres.length} semestres)`);
    console.log(`4. Información general de cursos`);
    console.log(`5. Cursos electivos (${cursosElectivos.cursos_electivos.length} grupos)`);
    console.log(`6. Información general de electivos`);
    console.log(`7. Estadísticas de requisitos`);
    console.log(`8. Cursos más requeridos`);
    console.log(`9. Información general de requisitos`);
    
  } catch (error) {
    console.error('❌ Error generando embeddings de malla curricular:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generarEmbeddingsMallaCurricular();
}

module.exports = { generarEmbeddingsMallaCurricular }; 