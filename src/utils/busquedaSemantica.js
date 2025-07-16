const fs = require('fs');
const OpenAI = require('openai');
const { getDB } = require('../db/ConfiguracionBaseDatos');
require('dotenv').config();
const path = require('path');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Archivos de embeddings relevantes (centralizado)
let EMBEDDINGS_FILES = [
  // Unidades del syllabus
  __dirname + '/../db/embeddings/embeddings_unidades.json',
  // Syllabus general
  __dirname + '/../db/embeddings/embeddings_syllabus_general.json',
  // Evaluación
  __dirname + '/../db/embeddings/syllabus_evaluacion_embeddings.json',
  // Malla curricular
  __dirname + '/../db/embeddings/malla_curricular_embeddings.json',
  // Perfil del asistente
  __dirname + '/../db/embeddings/perfil_asistente_embeddings.json',
  // Información institucional
  __dirname + '/../db/embeddings/informacion_institucional_embeddings.json',
  // Horarios de cursos
  __dirname + '/../db/embeddings/embeddings_horarios.json',
];
// --- AGREGADO: cargar dinámicamente todos los embeddings de materiales ---
try {
  const embeddingsDir = path.join(__dirname, '../db/embeddings');
  const files = fs.readdirSync(embeddingsDir);
  const materiales = files.filter(f => f.startsWith('embeddings_material_') && f.endsWith('.json'));
  EMBEDDINGS_FILES = EMBEDDINGS_FILES.concat(materiales.map(f => path.join(embeddingsDir, f)));
  console.log('✅ Archivos de embeddings de materiales cargados:', materiales.length);
} catch (e) {
  console.error('❌ Error cargando embeddings de materiales:', e);
}

// Cache para los datos de cursos
let cursosCache = null;
let relacionesRequisitosCache = null;

/**
 * Carga los datos de cursos desde el archivo JSON
 * @returns {Object} Datos de todos los cursos
 */
function cargarDatosCursos() {
  if (!cursosCache) {
    try {
      const cursosPorSemestre = JSON.parse(fs.readFileSync(__dirname + '/../db/malla_curricular/CursosPorSemestre.json', 'utf8'));
      const cursos = {};
      
      // Crear un mapa de número de curso -> información del curso
      cursosPorSemestre.semestres.forEach(semestre => {
        semestre.cursos.forEach(curso => {
          cursos[curso.numero] = {
            nombre: curso.nombre,
            creditos: curso.creditos,
            requisitos: curso.requisitos,
            tipo: curso.tipo,
            semestre: semestre.semestre
          };
        });
      });
      
      cursosCache = cursos;
    } catch (error) {
      console.error('Error cargando datos de cursos:', error);
      cursosCache = {};
    }
  }
  return cursosCache;
}

/**
 * Carga las relaciones de requisitos
 * @returns {Object} Relaciones de requisitos
 */
function cargarRelacionesRequisitos() {
  if (!relacionesRequisitosCache) {
    try {
      const relaciones = JSON.parse(fs.readFileSync(__dirname + '/../db/malla_curricular/RelacionesRequisitos.json', 'utf8'));
      relacionesRequisitosCache = relaciones;
    } catch (error) {
      console.error('Error cargando relaciones de requisitos:', error);
      relacionesRequisitosCache = { relaciones_requisitos: { prerrequisitos: {}, cursos_que_requieren: {} } };
    }
  }
  return relacionesRequisitosCache;
}

/**
 * Convierte números de cursos en nombres
 * @param {Array<number>} numerosCursos - Array de números de cursos
 * @returns {Array<string>} Array de nombres de cursos
 */
function convertirNumerosEnNombres(numerosCursos) {
  const cursos = cargarDatosCursos();
  return numerosCursos.map(numero => {
    const curso = cursos[numero];
    return curso ? `${numero}: ${curso.nombre}` : `${numero}: Curso no encontrado`;
  });
}

/**
 * Busca información de requisitos de un curso específico
 * @param {string} nombreCurso - Nombre del curso a buscar
 * @returns {Object|null} Información de requisitos del curso
 */
function buscarRequisitosCurso(nombreCurso) {
  const cursos = cargarDatosCursos();
  
  // Buscar el curso por nombre
  const cursoEncontrado = Object.entries(cursos).find(([numero, curso]) => 
    curso.nombre.toLowerCase().includes(nombreCurso.toLowerCase())
  );
  
  if (!cursoEncontrado) {
    return null;
  }
  
  const [numero, curso] = cursoEncontrado;
  const nombresRequisitos = convertirNumerosEnNombres(curso.requisitos);
  
  return {
    numero: parseInt(numero),
    nombre: curso.nombre,
    creditos: curso.creditos,
    semestre: curso.semestre,
    requisitos: curso.requisitos,
    nombresRequisitos: nombresRequisitos
  };
}

/**
 * Busca qué cursos requieren un curso específico
 * @param {string} nombreCurso - Nombre del curso
 * @returns {Array} Cursos que requieren el curso especificado
 */
function buscarCursosQueRequieren(nombreCurso) {
  const cursos = cargarDatosCursos();
  const relaciones = cargarRelacionesRequisitos();
  
  // Buscar el curso por nombre
  const cursoEncontrado = Object.entries(cursos).find(([numero, curso]) => 
    curso.nombre.toLowerCase().includes(nombreCurso.toLowerCase())
  );
  
  if (!cursoEncontrado) {
    return [];
  }
  
  const [numero] = cursoEncontrado;
  const cursosQueRequieren = relaciones.relaciones_requisitos.cursos_que_requieren[numero] || [];
  
  return convertirNumerosEnNombres(cursosQueRequieren);
}

function similitudCoseno(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
}

/**
 * Busca información específica de una unidad del syllabus
 * @param {string} pregunta - Texto de la consulta del usuario
 * @returns {Object|null} Información de la unidad si se encuentra
 */
function buscarInformacionUnidad(pregunta) {
  // Patrones para detectar consultas sobre unidades
  const patronesUnidad = [
    /unidad\s*(\d+)/i,
    /tema\w*\s+de\s+la\s+unidad\s*(\d+)/i,
    /qué\s+(?:temas?|contenidos?)\s+(?:se\s+ven\s+)?en\s+la\s+unidad\s*(\d+)/i,
    /unidad\s*(\d+)\s+(?:temas?|contenidos?)/i
  ];

  let numeroUnidad = null;
  
  // Buscar coincidencias en los patrones
  for (const patron of patronesUnidad) {
    const match = pregunta.match(patron);
    if (match) {
      numeroUnidad = parseInt(match[1]);
      break;
    }
  }

  if (!numeroUnidad) {
    return null;
  }

  try {
    // Obtener datos del syllabus de unidades
    const db = getDB('syllabus/SyllabusUnidades.json');
    const unidades = db.get('unidades').value();
    
    // Buscar la unidad específica
    const unidad = unidades.find(u => u.id === numeroUnidad);
    
    if (!unidad) {
      return { error: `No se encontró la unidad ${numeroUnidad}` };
    }

    return {
      unidad: unidad,
      numeroUnidad: numeroUnidad,
      tipo: 'unidad'
    };
  } catch (error) {
    console.error('Error al buscar información de unidad:', error);
    return null;
  }
}

/**
 * Busca información específica sobre requisitos de cursos
 * @param {string} pregunta - Texto de la consulta del usuario
 * @returns {Object|null} Información de requisitos si se encuentra
 */
function buscarInformacionRequisitos(pregunta) {
  // Patrones para detectar consultas sobre requisitos
  const patronesRequisitos = [
    /(?:qué|cuáles?)\s+(?:prerrequisitos?|requisitos?)\s+(?:se\s+)?(?:necesita|requiere|pide)\s+(?:para\s+)?(?:el\s+)?(?:curso\s+de\s+)?(.+?)(?:\?|$)/i,
    /(?:prerrequisitos?|requisitos?)\s+(?:de|para)\s+(?:el\s+)?(?:curso\s+de\s+)?(.+?)(?:\?|$)/i,
    /(?:qué|cuáles?)\s+(?:cursos?)\s+(?:abren|es\s+requisito\s+de|requiere)\s+(?:el\s+)?(?:curso\s+de\s+)?(.+?)(?:\?|$)/i
  ];

  let nombreCurso = null;
  
  // Buscar coincidencias en los patrones
  for (const patron of patronesRequisitos) {
    const match = pregunta.match(patron);
    if (match) {
      nombreCurso = match[1].trim();
      break;
    }
  }

  if (!nombreCurso) {
    return null;
  }

  // Buscar información del curso
  const infoCurso = buscarRequisitosCurso(nombreCurso);
  const cursosQueRequieren = buscarCursosQueRequieren(nombreCurso);

  if (!infoCurso) {
    return { error: `No se encontró información sobre el curso "${nombreCurso}"` };
  }

  return {
    tipo: 'requisitos',
    curso: infoCurso,
    cursosQueRequieren: cursosQueRequieren
  };
}

/**
 * Busca información general sobre la malla curricular según la pregunta.
 * @param {string} pregunta
 * @returns {string|null}
 */
function responderPreguntaGeneralMalla(pregunta) {
  const cursosPorSemestre = JSON.parse(fs.readFileSync(__dirname + '/../db/malla_curricular/CursosPorSemestre.json', 'utf8'));
  const semestres = cursosPorSemestre.semestres;

  // ¿Cuántos semestres hay en la carrera?
  if (/cu[aá]ntos?\s+semestres?\s+(hay|tiene|son)\b/i.test(pregunta)) {
    return `La carrera tiene ${semestres.length} semestres.`;
  }

  // ¿Cuál es el total de créditos del semestre X?
  const matchCreditos = pregunta.match(/cr[eé]ditos?\s+(?:del|en)\s+semestre\s+(\d+)/i);
  if (matchCreditos) {
    const num = parseInt(matchCreditos[1]);
    const semestre = semestres.find(s => s.semestre === num);
    if (semestre) {
      return `El semestre ${num} tiene un total de ${semestre.total_creditos} créditos.`;
    } else {
      return `No se encontró información para el semestre ${num}.`;
    }
  }

  // ¿Qué cursos se dictan en el último semestre?
  if (/cursos?\s+(se\s+dictan|del)\s+(último|ultimo)\s+semestre/i.test(pregunta)) {
    const ultimo = semestres[semestres.length - 1];
    const cursos = ultimo.cursos.map(c => `${c.numero}: ${c.nombre}`).join(', ');
    return `En el último semestre (${ultimo.semestre}) se dictan los cursos: ${cursos}`;
  }

  // ¿Cuáles son los cursos obligatorios del semestre X?
  const matchOblig = pregunta.match(/cursos?\s+obligatorios?\s+(?:del|en)\s+semestre\s+(\d+)/i);
  if (matchOblig) {
    const num = parseInt(matchOblig[1]);
    const semestre = semestres.find(s => s.semestre === num);
    if (semestre) {
      const oblig = semestre.cursos.filter(c => c.tipo === 'obligatorio').map(c => `${c.numero}: ${c.nombre}`);
      return oblig.length > 0 ? `Cursos obligatorios del semestre ${num}:\n${oblig.join('\n')}` : `No hay cursos obligatorios en el semestre ${num}.`;
    } else {
      return `No se encontró información para el semestre ${num}.`;
    }
  }

  // ¿Cuántos créditos tiene la carrera?
  if (/cu[aá]ntos?\s+cr[eé]ditos?\s+(tiene|son|hay|total)/i.test(pregunta) || /total\s+de\s+cr[eé]ditos?/i.test(pregunta)) {
    const infoGeneral = JSON.parse(fs.readFileSync(__dirname + '/../db/malla_curricular/InformacionGeneral.json', 'utf8'));
    return `La carrera tiene un total de ${infoGeneral.total_creditos} créditos.`;
  }

  return null;
}

/**
 * Detecta si una pregunta es sobre horarios
 * @param {string} pregunta - Texto de la consulta del usuario
 * @returns {boolean} True si la pregunta es sobre horarios
 */
function esPreguntaSobreHorarios(pregunta) {
  const palabrasHorarios = [
    'docente', 'profesor', 'maestro', 'instructor',
    'horario', 'horarios', 'hora', 'horas',
    'día', 'días', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo',
    'aula', 'aulas', 'salón', 'salones',
    'teoría', 'práctica', 'laboratorio',
    'sesión', 'sesiones',
    'piso', 'pisos',
    'inicio', 'fin', 'termina', 'empieza',
    'ciclo', 'código', 'codigo', 'semestre', 'sección', 'seccion'
  ];
  
  const preguntaLower = pregunta.toLowerCase();
  return palabrasHorarios.some(palabra => preguntaLower.includes(palabra));
}

/**
 * Busca los fragmentos más relevantes en uno o varios archivos de embeddings dado un texto de consulta.
 * @param {string} pregunta - Texto de la consulta del usuario.
 * @param {string|Array<string>} embeddingsFilePaths - Ruta(s) a los archivos de embeddings.
 * @param {number} topK - Número de fragmentos más relevantes a devolver.
 * @returns {Promise<Array>} Fragmentos más relevantes (ordenados por similitud descendente).
 */
async function buscarFragmentosRelevantes(pregunta, embeddingsFilePaths, topK = 2) {
  // Primero verificar si es una consulta sobre una unidad específica
  const infoUnidad = buscarInformacionUnidad(pregunta);
  
  if (infoUnidad && infoUnidad.tipo === 'unidad') {
    // Es una consulta sobre una unidad específica
    const unidad = infoUnidad.unidad;
    const temas = unidad.semanas.map(semana => ({
      semana: semana.semana,
      contenido_tematico: semana.contenido_tematico,
      sesiones: semana.sesiones,
      evidencia: semana.evidencia
    }));
    
    return [{
      texto: `Unidad ${infoUnidad.numeroUnidad}: ${unidad.titulo}\n\nLogro de aprendizaje: ${unidad.logro_aprendizaje}\n\nTemas por semana:\n${temas.map(t => `Semana ${t.semana}: ${t.contenido_tematico}\n- Sesiones: ${Array.isArray(t.sesiones) ? t.sesiones.join(', ') : t.sesiones || 'No especificadas'}\n- Evidencia: ${t.evidencia || 'No especificada'}`).join('\n\n')}`,
      similitud: 1.0, // Máxima similitud para consultas específicas de unidad
      tipo: 'unidad_especifica'
    }];
  }

  // Verificar si es una pregunta sobre horarios PRIMERO
  const esHorarios = esPreguntaSobreHorarios(pregunta);
  
  // Si es pregunta sobre horarios, ir directamente a búsqueda semántica
  if (esHorarios) {
    console.log('🔍 Pregunta detectada como sobre horarios, saltando búsqueda de requisitos');
  } else {
    // Solo verificar requisitos si NO es pregunta sobre horarios
    const infoRequisitos = buscarInformacionRequisitos(pregunta);
    
    if (infoRequisitos && infoRequisitos.tipo === 'requisitos') {
      const curso = infoRequisitos.curso;
      const cursosQueRequieren = infoRequisitos.cursosQueRequieren;
      
      let texto = `📚 **${curso.nombre}** (Curso ${curso.numero})\n\n`;
      texto += `📊 **Información del curso:**\n`;
      texto += `• Créditos: ${curso.creditos}\n`;
      texto += `• Semestre: ${curso.semestre}\n`;
      texto += `• Tipo: ${curso.tipo}\n\n`;
      
      if (curso.requisitos.length > 0) {
        texto += `📋 **Prerrequisitos:**\n`;
        texto += curso.nombresRequisitos.map(req => `• ${req}`).join('\n');
      } else {
        texto += `📋 **Prerrequisitos:** No tiene prerrequisitos\n`;
      }
      
      if (cursosQueRequieren.length > 0) {
        texto += `\n🔗 **Cursos que requieren este curso:**\n`;
        texto += cursosQueRequieren.map(curso => `• ${curso}`).join('\n');
      } else {
        texto += `\n🔗 **Cursos que requieren este curso:** Ninguno`;
      }
      
      return [{
        texto: texto,
        similitud: 1.0, // Máxima similitud para consultas específicas de requisitos
        tipo: 'requisitos_especificos'
      }];
    }
  }

  // Usar archivos por defecto si no se especifican
  let paths = embeddingsFilePaths ? (Array.isArray(embeddingsFilePaths) ? embeddingsFilePaths : [embeddingsFilePaths]) : EMBEDDINGS_FILES;
  
  // Si es pregunta sobre horarios, priorizar el archivo de horarios y excluir malla curricular
  if (esHorarios) {
    const horariosPath = __dirname + '/../db/embeddings/embeddings_horarios.json';
    const mallaPath = __dirname + '/../db/embeddings/malla_curricular_embeddings.json';
    // Solo usar horarios y excluir malla curricular para evitar conflictos
    paths = [horariosPath, ...paths.filter(p => p !== horariosPath && p !== mallaPath)];
    console.log('🔍 Pregunta detectada como sobre horarios, usando solo embeddings de horarios (excluyendo malla curricular)');
  }

  // Generar embedding de la pregunta
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: pregunta
  });
  const embeddingPregunta = response.data[0].embedding;

  // Leer y combinar todos los embeddings
  let embeddingsData = [];
  for (const filePath of paths) {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      embeddingsData = embeddingsData.concat(data);
    }
  }

  // Calcular similitud coseno para cada fragmento
  const resultados = embeddingsData.map(fragmento => {
    let similitud = similitudCoseno(embeddingPregunta, fragmento.embedding);
    
    // Si es pregunta sobre horarios y el fragmento es de horarios, dar boost
    if (esHorarios && fragmento.fuente === "HorariosCursos.json") {
      similitud += 0.1; // Boost de 0.1 para priorizar horarios
    }
    
    return {
      ...fragmento,
      similitud: similitud
    };
  });

  // Ordenar por similitud descendente y devolver topK
  resultados.sort((a, b) => b.similitud - a.similitud);

  // Log para depuración: mostrar top similitud
  if (resultados.length > 0) {
    console.log('Top similitud de fragmentos:', resultados.slice(0, 5).map(f => ({ 
      similitud: f.similitud, 
      texto: (f.text || f.texto || 'Sin texto').slice(0, 60) 
    })));
  } else {
    console.log('No se encontraron fragmentos para comparar.');
  }

  return resultados.slice(0, topK);
}

// Utilidad para normalizar nombres (sin tildes, minúsculas)
function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Busca un curso por nombre aproximado (ignorando mayúsculas, minúsculas y tildes)
 * @param {string} nombreCurso
 * @returns {Object|null} Curso encontrado o null
 */
function buscarCursoPorNombreAproximado(nombreCurso) {
  const cursos = cargarDatosCursos();
  const nombreNormalizado = removeDiacritics(nombreCurso);
  for (const [numero, curso] of Object.entries(cursos)) {
    if (removeDiacritics(curso.nombre).includes(nombreNormalizado)) {
      return { ...curso, numero: parseInt(numero) };
    }
  }
  return null;
}

/**
 * Busca los cursos que dependen de un curso dado (dependencias inversas)
 * @param {string} nombreCurso
 * @returns {Array<string>} Lista de cursos dependientes
 */
function buscarCursosDependientes(nombreCurso) {
  const cursos = cargarDatosCursos();
  const cursoBase = buscarCursoPorNombreAproximado(nombreCurso);
  if (!cursoBase) return [];
  const dependientes = Object.entries(cursos)
    .filter(([_, curso]) => curso.requisitos.includes(cursoBase.numero))
    .map(([num, curso]) => `${num}: ${curso.nombre}`);
  return dependientes;
}

/**
 * Busca cursos que tienen como requisito un curso dado (por nombre o número)
 * @param {string} nombreOCodigoCurso
 * @returns {Array<string>} Lista de cursos que requieren el curso dado
 */
function buscarCursosQueTienenComoRequisito(nombreOCodigoCurso) {
  const cursos = cargarDatosCursos();
  let numeroCurso = null;
  // Buscar por nombre aproximado
  const cursoBase = buscarCursoPorNombreAproximado(nombreOCodigoCurso);
  if (cursoBase) {
    numeroCurso = cursoBase.numero;
  } else if (!isNaN(Number(nombreOCodigoCurso))) {
    numeroCurso = Number(nombreOCodigoCurso);
  }
  if (!numeroCurso) return [];
  // Buscar todos los cursos que tienen este curso como requisito
  return Object.entries(cursos)
    .filter(([_, curso]) => curso.requisitos.includes(numeroCurso))
    .map(([num, curso]) => `${num}: ${curso.nombre}`);
}

/**
 * Devuelve los cursos del primer semestre (inicio de la malla)
 * @returns {Array<string>} Lista de cursos del primer semestre
 */
function cursosInicioMalla() {
  const cursos = cargarDatosCursos();
  return Object.entries(cursos)
    .filter(([_, curso]) => curso.semestre === 1)
    .map(([num, curso]) => `${num}: ${curso.nombre}`);
}

/**
 * Devuelve los cursos con más prerrequisitos (top 5)
 * @returns {Array<string>} Lista de cursos con más prerrequisitos
 */
function cursosConMasPrerrequisitos(top = 5) {
  const cursos = cargarDatosCursos();
  return Object.entries(cursos)
    .sort((a, b) => b[1].requisitos.length - a[1].requisitos.length)
    .slice(0, top)
    .map(([num, curso]) => `${num}: ${curso.nombre} (${curso.requisitos.length} prerrequisitos)`);
}

/**
 * Devuelve los cursos que se pueden llevar después de aprobar un curso dado
 * @param {string} nombreOCodigoCurso
 * @returns {Array<string>}
 */
function buscarCursosPosteriores(nombreOCodigoCurso) {
  return buscarCursosQueTienenComoRequisito(nombreOCodigoCurso);
}

module.exports = { 
  buscarFragmentosRelevantes,
  buscarInformacionUnidad,
  buscarInformacionRequisitos,
  convertirNumerosEnNombres,
  buscarRequisitosCurso,
  buscarCursosQueRequieren,
  buscarCursosQueTienenComoRequisito,
  buscarCursosPosteriores,
  responderPreguntaGeneralMalla,
  buscarCursoPorNombreAproximado,
  buscarCursosDependientes,
  cursosInicioMalla,
  cursosConMasPrerrequisitos,
  esPreguntaSobreHorarios,
  EMBEDDINGS_FILES 
};