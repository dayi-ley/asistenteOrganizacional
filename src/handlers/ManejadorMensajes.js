const { identificarUsuario, guardarEnHistorial, leerHistorialUsuario } = require('../utils/gestionUsuarios');
const { obtenerRespuestaGPT } = require('../utils/openaiClient');
const {
  buscarFragmentosRelevantes,
  buscarInformacionUnidad,
  buscarInformacionRequisitos,
  buscarCursosQueTienenComoRequisito,
  buscarCursosPosteriores,
  responderPreguntaGeneralMalla,
  buscarCursoPorNombreAproximado,
  buscarCursosDependientes,
  cursosInicioMalla,
  cursosConMasPrerrequisitos
} = require('../utils/busquedaSemantica');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');

/**
 * Limpia el número de WhatsApp removiendo el sufijo @c.us
 * @param {string} numero - Número con formato de WhatsApp (ej: 51929486812@c.us)
 * @returns {string} Número limpio (ej: 51929486812)
 */
function limpiarNumero(numero) {
    return numero.replace('@c.us', '');
}

const UMBRAL_SIMILITUD = 0.25; // Umbral ajustado para capturar información relevante

/**
 * Maneja un mensaje entrante de WhatsApp.
 * - Identifica el usuario por número (solo usuarios existentes).
 * - Guarda el mensaje recibido en el historial.
 * - Responde de forma personalizada si el usuario dice 'hola'.
 * - Usa GPT para otros mensajes.
 * - Guarda la respuesta del bot en el historial.
 * @param {object} client - Instancia de WWebJS client.
 * @param {string} numero - Número de teléfono del usuario.
 * @param {string} mensaje - Mensaje recibido del usuario.
 */
async function manejarMensaje(client, numero, mensaje) {
  console.log('DEBUG manejarMensaje argumentos:', {
    clientType: typeof client,
    numero,
    mensaje
  });
  // 1. Limpiar número y identificar usuario
  const numeroLimpio = limpiarNumero(numero);
  console.log(`🔍 Buscando usuario con número: ${numeroLimpio}`);
  
  const usuario = identificarUsuario(numeroLimpio);
  console.log(`👤 Usuario encontrado:`, JSON.stringify(usuario, null, 2));

  // 2. Verificar si el usuario existe
  if (!usuario) {
    const respuestaBot = `❌ Lo siento, tu número no está registrado en el sistema. Este asistente es exclusivo para estudiantes del curso de Ingeniería de Sistemas de Información.`;
    guardarEnHistorial(numeroLimpio, mensaje, 'usuario');
    guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
    return respuestaBot;
  }

  // 3. Guardar mensaje recibido en historial
  guardarEnHistorial(numeroLimpio, mensaje, 'usuario');

  // 4. Lógica específica según el rol del usuario
  let respuestaBot;
  
  // Si es docente, manejar respuestas específicas para docente
  if (usuario.rol === 'docente') {
    if (mensaje.trim().toLowerCase() === 'hola') {
      const nombre = usuario.nombre.nombres.split(' ')[0];
      respuestaBot = `¡Hola, Ing. ${nombre}! Soy ISIUX, su asistente académico. ¿En qué puedo ayudarle hoy?`;
    } else if (/c[oó]mo\s+te\s+llamas|cu[aá]l\s+es\s+tu\s+nombre|qui[eé]n\s+eres|quien\s+eres/i.test(mensaje)) {
      respuestaBot = "Me llamo ISIUX, su asistente académico para el curso de Ingeniería de Sistemas de Información.";
    } else if (/qu[eé]\s+curso\s+enseño|qu[eé]\s+curso\s+dicto|qu[eé]\s+curso\s+imparto/i.test(mensaje)) {
      respuestaBot = "Usted dicta el curso de Ingeniería de Sistemas de Información (código: 101029) en el ciclo VII, sección B.";
    } else if (/qu[eé]\s+temas?\s+me\s+toca\s+enseñar|qu[eé]\s+temas?\s+enseño\s+hoy|qu[eé]\s+contenido\s+imparto/i.test(mensaje)) {
      respuestaBot = "Para consultar los temas específicos del día, necesitaría saber qué semana o unidad está desarrollando actualmente. Puede consultar el syllabus del curso para ver el cronograma detallado.";
    } else if (/en\s+qu[eé]\s+aula\s+tengo\s+clase|d[oó]nde\s+es\s+mi\s+clase|qu[eé]\s+aula\s+uso/i.test(mensaje)) {
      respuestaBot = "Sus clases se dictan en:\n• Martes: Aula 404 (cuarto piso)\n• Miércoles: Aula 403 (cuarto piso)";
    } else if (/cu[aá]l\s+es\s+mi\s+horario|qu[eé]\s+horario\s+tengo|cu[aá]ndo\s+es\s+mi\s+clase/i.test(mensaje)) {
      respuestaBot = "Su horario de clases es:\n• Martes: 19:40 - 21:20 (Teoría)\n• Miércoles: 18:00 - 20:30 (Práctica)";
    } else if (/qu[eé]\s+secci[oó]n\s+tengo\s+a\s+cargo|de\s+qu[eé]\s+secci[oó]n\s+soy\s+responsable/i.test(mensaje)) {
      respuestaBot = "Usted tiene a cargo la Sección B del curso de Ingeniería de Sistemas de Información.";
    } else if (/cu[aá]ntos?\s+estudiantes?\s+tengo|cu[aá]ntos?\s+alumnos?\s+tengo/i.test(mensaje)) {
      respuestaBot = "Usted tiene 30 estudiantes registrados en la Sección B del curso de Ingeniería de Sistemas de Información.";
    } else if (/qu[eé]\s+materiales?\s+necesito|qu[eé]\s+materiales?\s+requiero/i.test(mensaje)) {
      respuestaBot = "Para consultar los materiales específicos, puede revisar el syllabus del curso o consultar qué unidad está desarrollando actualmente.";
    } else {
      // Para otras preguntas del docente, usar búsqueda semántica
      const fragmentos = await buscarFragmentosRelevantes(mensaje, undefined, 3);
      const fragmentosFiltrados = fragmentos.filter(f => f.similitud >= UMBRAL_SIMILITUD);
      
      if (fragmentosFiltrados.length > 0) {
        const contexto = fragmentosFiltrados.map(f => f.text || f.texto || f.contenido || '').join('\n').trim();
        const prompt = `Usted es un asistente académico respondiendo a un docente. Responda de forma profesional y respetuosa usando SOLO esta información interna. Si la respuesta no está en el contexto, responda: "No tengo información específica sobre eso en mi base de datos".\n\nContexto:\n${contexto}\n\nPregunta del docente: ${mensaje}`;
        respuestaBot = await obtenerRespuestaGPT(prompt);
      } else {
        respuestaBot = "No tengo información específica sobre eso en mi base de datos. ¿Puede reformular su pregunta o consultar sobre otro aspecto del curso?";
      }
    }
  } else {
    // Lógica para estudiantes (código existente)
    if (mensaje.trim().toLowerCase() === 'hola') {
      // Extraer primer nombre de la estructura de datos del usuario
      let nombre = numeroLimpio; // Por defecto usa el número
      
      if (usuario.nombre && usuario.nombre.nombres) {
        // Extraer solo el primer nombre
        nombre = usuario.nombre.nombres.split(' ')[0];
        console.log(`✅ Usando nombre: ${nombre}`);
      } else {
        console.log(`❌ No se encontró nombre en el usuario`);
      }
      
      respuestaBot = `¡Hola, ${nombre}! ¿En qué puedo ayudarte hoy?`;
    } else if (/c[oó]mo\s+te\s+llamas|cu[aá]l\s+es\s+tu\s+nombre|qui[eé]n\s+eres|quien\s+eres/i.test(mensaje)) {
      respuestaBot = "Me llamo ISIUX, tu asistente académico para el curso de Ingeniería de Sistemas de Información.";
    } else {
      try {
        // --- FLUJO: Última pregunta/interacción ---
        const regexUltimaPregunta = /(qué|cual)[^?]*pregunt[ée] (hace un momento|antes|la vez pasada|recién|última|ultima|anterior|último|ultimo|previamente)/i;
        if (regexUltimaPregunta.test(mensaje)) {
          const historial = leerHistorialUsuario(numeroLimpio);
          // Buscar la última pregunta del usuario antes de este mensaje
          let idx = historial.length - 1;
          // Saltar el mensaje actual
          idx--;
          while (idx >= 0 && historial[idx].tipo !== 'usuario') {
            idx--;
          }
          if (idx >= 0) {
            respuestaBot = `Tu última pregunta fue: "${historial[idx].mensaje}"`;
          } else {
            respuestaBot = 'No encontré ninguna pregunta anterior en tu historial.';
          }
          guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
          return respuestaBot;
        }

        // --- FLUJO: Resumen de historial por fecha o rango ---
        const regexResumenFecha = /(resumen|resúmeme|resumeme|de qué hablamos|que temas tratamos|que hablamos|que conversamos|que se habló|que se hablo|hazme un resumen)[^\d]*(ayer|hoy|anoche|esta semana|la semana pasada|el lunes|el martes|el miércoles|el jueves|el viernes|el sábado|el domingo|\d{1,2} de [a-zA-Z]+|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i;
        if (regexResumenFecha.test(mensaje)) {
          const historial = leerHistorialUsuario(numeroLimpio);
          // Extraer fecha o palabra clave
          const match = mensaje.match(regexResumenFecha);
          let fechaTexto = match ? match[2] : '';
          let fechas = [];
          const hoy = new Date();
          if (/ayer/i.test(fechaTexto)) {
            const d = new Date(hoy);
            d.setDate(hoy.getDate() - 1);
            fechas = [d.toISOString().slice(0, 10)];
          } else if (/hoy/i.test(fechaTexto)) {
            fechas = [hoy.toISOString().slice(0, 10)];
          } else if (/anoche/i.test(fechaTexto)) {
            const d = new Date(hoy);
            d.setDate(hoy.getDate() - 1);
            fechas = [d.toISOString().slice(0, 10)];
          } else if (/semana pasada/i.test(fechaTexto)) {
            const d = new Date(hoy);
            d.setDate(hoy.getDate() - 7);
            for (let i = 0; i < 7; i++) {
              const day = new Date(d);
              day.setDate(d.getDate() + i);
              fechas.push(day.toISOString().slice(0, 10));
            }
          } else if (/esta semana/i.test(fechaTexto)) {
            const d = new Date(hoy);
            d.setDate(hoy.getDate() - hoy.getDay());
            for (let i = 0; i < 7; i++) {
              const day = new Date(d);
              day.setDate(d.getDate() + i);
              fechas.push(day.toISOString().slice(0, 10));
            }
          } else if (/\d{1,2} de [a-zA-Z]+/i.test(fechaTexto)) {
            // Ejemplo: 10 de julio
            const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
            const m = fechaTexto.match(/(\d{1,2}) de ([a-zA-Z]+)/i);
            if (m) {
              const dia = parseInt(m[1]);
              const mes = meses.findIndex(mes => mes.startsWith(m[2].toLowerCase()));
              const anio = hoy.getFullYear();
              if (mes >= 0) {
                const fecha = new Date(anio, mes, dia);
                fechas = [fecha.toISOString().slice(0, 10)];
              }
            }
          } else if (/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/.test(fechaTexto)) {
            // Ejemplo: 10/07 o 10/07/2025
            const m = fechaTexto.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
            if (m) {
              const dia = parseInt(m[1]);
              const mes = parseInt(m[2]) - 1;
              const anio = m[3] ? parseInt(m[3]) : hoy.getFullYear();
              const fecha = new Date(anio, mes, dia);
              fechas = [fecha.toISOString().slice(0, 10)];
            }
          }
          // Filtrar mensajes del usuario en esas fechas
          const mensajes = historial.filter(h => h.tipo === 'usuario' && fechas.includes((new Date(h.fecha)).toISOString().slice(0, 10)));
          if (mensajes.length === 0) {
            respuestaBot = 'No encontré mensajes tuyos en esa fecha.';
          } else if (mensajes.length === 1) {
            respuestaBot = `Ese día me preguntaste: "${mensajes[0].mensaje}"`;
          } else {
            // Si hay muchos mensajes, hacer resumen con GPT si está disponible
            const preguntas = mensajes.map(h => h.mensaje);
            if (typeof obtenerRespuestaGPT === 'function') {
              const prompt = `Haz un resumen breve y claro de los siguientes mensajes de un usuario en una conversación académica:\n\n${preguntas.map((p,i)=>`Mensaje ${i+1}: ${p}`).join('\n')}\n\nResumen:`;
              respuestaBot = await obtenerRespuestaGPT(prompt);
            } else {
              respuestaBot = `Ese día me preguntaste:\n- ` + preguntas.join('\n- ');
            }
          }
          guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
          return respuestaBot;
        }
        // 0. Preguntas directas sobre electivos
        if (/cu[aá]ntos?\s+cursos?\s+electivos?\s+(hay|existen|tiene)/i.test(mensaje)) {
          respuestaBot = 'En la malla curricular existen 3 cursos electivos, uno en cada semestre del 5º, 6º y 7º. En la práctica, estos electivos son asignados por la facultad.';
        } else if (/en\s+qu[eé]\s+semestres?\s+(se\s+llevan|se\s+dictan|son)\s+los?\s+electivos?/i.test(mensaje)) {
          respuestaBot = 'Los cursos electivos se llevan en los semestres 5, 6 y 7.';
        } else if (/qu[eé]\s+cursos?\s+debo\s+(haber\s+aprobado|aprobar)\s+para\s+llev(ar|ar\s+el|ar\s+la)\s+(.+?)(\?|$)/i.test(mensaje)) {
          // 0.5 Pregunta de prerrequisitos de un curso
          const matchPre = mensaje.match(/qu[eé]\s+cursos?\s+debo\s+(haber\s+aprobado|aprobar)\s+para\s+llev(ar|ar\s+el|ar\s+la)\s+(.+?)(\?|$)/i);
          const nombreCurso = matchPre[3].trim();
          const curso = buscarCursoPorNombreAproximado(nombreCurso);
          if (curso) {
            if (curso.requisitos && curso.requisitos.length > 0) {
              // Convertir números a nombres
              const cursosReq = curso.requisitos.map(num => {
                // Buscar el curso por número exacto
                const cursos = require('../db/malla_curricular/CursosPorSemestre.json').semestres.flatMap(s => s.cursos);
                const c = cursos.find(cursoItem => cursoItem.numero === num);
                return c ? `${c.numero}: ${c.nombre}` : num;
              });
              respuestaBot = `Para llevar "${curso.nombre}" debes haber aprobado los siguientes cursos:\n${cursosReq.join('\n')}`;
            } else {
              respuestaBot = `El curso "${curso.nombre}" no tiene prerrequisitos.`;
            }
          } else {
            respuestaBot = `No se encontró información sobre el curso solicitado.`;
          }
        } else if (/qu[eé]\s+pasa\s+si\s+no\s+apruebo\s+(.+?)(\?|$)/i.test(mensaje) || /qu[eé]\s+sucede\s+si\s+jalo\s+(.+?)(\?|$)/i.test(mensaje)) {
          // Nueva: Consecuencias de no aprobar un curso
          const matchNoAprueba = mensaje.match(/qu[eé]\s+pasa\s+si\s+no\s+apruebo\s+(.+?)(\?|$)/i) || mensaje.match(/qu[eé]\s+sucede\s+si\s+jalo\s+(.+?)(\?|$)/i);
          const nombreCurso = (matchNoAprueba[1] || matchNoAprueba[3] || '').trim();
          const dependientes = buscarCursosDependientes(nombreCurso);
          if (dependientes.length > 0) {
            respuestaBot = `Si no apruebas "${nombreCurso}", no podrás llevar los siguientes cursos que dependen de él:\n${dependientes.join('\n')}`;
          } else {
            respuestaBot = `Si no apruebas "${nombreCurso}", no hay cursos que dependan directamente de él.`;
          }
        } else {
          // --- INICIO INTEGRACIÓN MATERIALES DE CURSO ---
          // Detectar si la pregunta menciona semana o página
          let semanaFiltro = null;
          let paginaFiltro = null;
          const matchSemana = mensaje.match(/semana[_\s-]*(\d{1,2})/i);
          if (matchSemana) {
            semanaFiltro = `semana_${matchSemana[1].padStart(2, '0')}`;
          }
          const matchPagina = mensaje.match(/p[aá]gina[_\s-]*(\d{1,3})/i);
          if (matchPagina) {
            paginaFiltro = parseInt(matchPagina[1]);
          }
          // Buscar en todos los materiales embebidos
          let fragmentosMaterial = await buscarFragmentosRelevantes(mensaje, undefined, 10); // Traer más para filtrar
          // Filtrar por semana si corresponde
          if (semanaFiltro) {
            fragmentosMaterial = fragmentosMaterial.filter(f => f.semana === semanaFiltro);
          }
          // Filtrar por página si corresponde
          if (paginaFiltro) {
            fragmentosMaterial = fragmentosMaterial.filter(f => String(f.pagina) === String(paginaFiltro));
          }
          // Calcular similitud y tomar los top 3
          fragmentosMaterial.sort((a, b) => b.similitud - a.similitud);
          const fragmentosMaterialFiltrados = fragmentosMaterial.slice(0, 3).filter(f => f.similitud >= 0.25);

          // --- MEJORA: Si la pregunta es tipo '¿Qué tema se ve en la semana X?' y hay fragmentos de esa semana, mostrar el contenido aunque la similitud sea baja ---
          const regexPreguntaSemana = /qu[eé]?\s*(temas?|contenido|se ve|se estudia|se aprende|se revisa|se aborda|se trata|se cubre|se dicta|se imparte|se desarrolla|se explica|se realiza|se hace|se trabaja|se expone|se presenta|se analiza|se discute|se investiga|se observa|se eval[úu]a|se repasa|se revisa|se ve)\s+en\s+la\s+semana[_\s-]?(\d{1,2})/i;
          if (semanaFiltro && regexPreguntaSemana.test(mensaje) && fragmentosMaterial.length > 0) {
            // Mostrar el contenido de los fragmentos de esa semana (puedes ajustar para mostrar todos o solo el primero)
            const respuestaSemana = fragmentosMaterial.slice(0, 2).map(f => f.texto || f.text || f.contenido || '').join('\n\n');
            respuestaBot = respuestaSemana || 'No tengo información específica sobre esa semana.';
            // Guardar en historial el contexto de los fragmentos usados
            guardarEnHistorial(numeroLimpio, {
              respuesta: respuestaBot,
              contexto_fragmentos: fragmentosMaterial.slice(0, 2)
            }, 'bot');
            return respuestaBot;
          }
          // Si el usuario pide explícitamente la imagen/slide o el PDF
          if (fragmentosMaterialFiltrados.length > 0 && /(slide|imagen|image|img|png|foto|picture|pic|pdf|archivo)/i.test(mensaje)) {
            // --- INICIO MEJORA: buscar fragmento con imagen y keyword ---
            // 1. Extraer keyword principal de la pregunta
            function extraerKeyword(pregunta) {
              // Busca después de 'de', 'del', 'sobre', o la última palabra relevante
              const match = pregunta.match(/(?:de|del|sobre)\s+([\wáéíóúñ]+)/i);
              if (match) return match[1].toLowerCase();
              // Si no, toma la última palabra relevante (no stopword)
              const palabras = pregunta.split(/\s+/).filter(w => w.length > 2 && !['una','las','los','que','con','por','del','una','sus','sus','las','los','una','por','del','las','los','una','para','este','esta','ese','esa','aqui','alli','cual','cuales','como','donde','cuando','quien','quienes','cual','cuales','cual','cuales','sobre','slide','imagen','foto','pdf','archivo','mostrar','muéstrame','muestrame','dame','quiero','ver','la','el','un','una','de','en','y','o','es','al','lo','un','una','me','mi','tu','su','te','le','nos','os','se','si','ya','no','sí','si','pero','mas','más','menos','muy','tan','tanto','poco','mucho','muchos','muchas','pocos','pocas','todo','toda','todos','todas','ningun','ninguna','ninguno','ningunos','ningunas','algun','alguna','alguno','algunos','algunas','este','esta','estos','estas','ese','esa','esos','esas','aquel','aquella','aquellos','aquellas','cual','cuales','quien','quienes','cuyo','cuya','cuyos','cuyas','donde','cuando','como','cuanto','cuanta','cuantos','cuantas','que','quien','cual','cuales','donde','cuando','como','cuanto','cuanta','cuantos','cuantas']);
              return palabras.length > 0 ? palabras[palabras.length-1].toLowerCase() : '';
            }
            const keyword = extraerKeyword(mensaje);
            // Buscar fragmento con imagen y keyword
            let f = fragmentosMaterialFiltrados.find(frag => frag.imagen && frag.imagen.trim() && keyword && (frag.texto || '').toLowerCase().includes(keyword));
            // Si no encuentra, buscar cualquier fragmento con imagen
            if (!f) {
              f = fragmentosMaterialFiltrados.find(frag => frag.imagen && frag.imagen.trim());
            }
            // Si aún no, fallback al primero
            if (!f) {
              f = fragmentosMaterialFiltrados[0];
            }
            // Si el fragmento no tiene imagen, busca otro de la misma página que sí la tenga
            if ((!f.imagen || !f.imagen.trim()) && f.pagina) {
              const alternativo = fragmentosMaterialFiltrados.find(frag => frag.pagina === f.pagina && frag.imagen && frag.imagen.trim());
              if (alternativo) f = alternativo;
            }
            // Si pide imagen/slide
            if (/(slide|imagen|image|img|png|foto|picture|pic)/i.test(mensaje)) {
              // 1. Responde primero con la respuesta textual (GPT o fragmento)
              respuestaBot = fragmentosMaterialFiltrados[0].texto;
              await client.sendMessage(numero, respuestaBot + `\n(Fuente: ${f.archivo}, p. ${f.pagina})`);
              // 2. Luego intenta enviar la imagen
              const rutaAbsoluta = path.join(
                __dirname,
                '../db/materiales_curso',
                f.imagen.replace(/\\/g, '/').replace(/^procesados[\\/]/, 'procesados/')
              );
              console.log('DEBUG rutaAbsoluta imagen:', rutaAbsoluta, fs.existsSync(rutaAbsoluta));
              if (fs.existsSync(rutaAbsoluta)) {
                const media = MessageMedia.fromFilePath(rutaAbsoluta);
                await client.sendMessage(numero, media, { caption: 'Aquí tienes la imagen de la página.' });
                respuestaBot = null; // Ya se envió todo
              } else {
                respuestaBot = 'No se encontró la imagen solicitada.';
              }
              guardarEnHistorial(numeroLimpio, {
                respuesta: respuestaBot,
                contexto_fragmentos: fragmentosMaterialFiltrados.slice(0, 3).map(f => ({
                  archivo: f.archivo,
                  pagina: f.pagina,
                  cita: f.cita,
                  texto: (f.texto || f.text || f.contenido || '').slice(0, 120)
                }))
              }, 'bot');
              return respuestaBot;
            }
            // Si pide PDF
            if (/(pdf|archivo)/i.test(mensaje)) {
              // Buscar fragmento con PDF y keyword
              let fpdf = fragmentosMaterialFiltrados.find(frag => frag.ruta_pdf && frag.ruta_pdf.trim() && keyword && (frag.texto || '').toLowerCase().includes(keyword));
              if (!fpdf) {
                fpdf = fragmentosMaterialFiltrados.find(frag => frag.ruta_pdf && frag.ruta_pdf.trim());
              }
              if (!fpdf) {
                fpdf = fragmentosMaterialFiltrados[0];
              }
              // 1. Responde primero con la respuesta textual (GPT o fragmento)
              respuestaBot = fragmentosMaterialFiltrados[0].texto;
              await client.sendMessage(numero, respuestaBot + `\n(Fuente: ${fpdf.archivo}, p. ${fpdf.pagina})`);
              // 2. Luego intenta enviar el PDF como archivo adjunto
              const rutaAbsolutaPDF = path.join(
                __dirname,
                '../db/materiales_curso',
                fpdf.ruta_pdf.replace(/\\/g, '/').replace(/^procesados[\\/]/, 'procesados/')
              );
              console.log('DEBUG rutaAbsoluta PDF:', rutaAbsolutaPDF, fs.existsSync(rutaAbsolutaPDF));
              if (fs.existsSync(rutaAbsolutaPDF)) {
                const mediaPDF = MessageMedia.fromFilePath(rutaAbsolutaPDF);
                await client.sendMessage(numero, mediaPDF, { caption: 'Aquí tienes el archivo PDF solicitado.' });
                respuestaBot = null;
              } else {
                respuestaBot = `No se encontró el archivo PDF solicitado (${fpdf.ruta_pdf}).`;
              }
              guardarEnHistorial(numeroLimpio, {
                respuesta: respuestaBot,
                contexto_fragmentos: fragmentosMaterialFiltrados.slice(0, 3).map(f => ({
                  archivo: f.archivo,
                  pagina: f.pagina,
                  cita: f.cita,
                  texto: (f.texto || f.text || f.contenido || '').slice(0, 120)
                }))
              }, 'bot');
              return respuestaBot;
            }
          }
          // Si hay fragmentos relevantes pero NO es petición de imagen/pdf, responde con el texto y guarda contexto
          if (fragmentosMaterialFiltrados.length > 0 && !/(slide|imagen|image|img|png|foto|picture|pic|pdf|archivo)/i.test(mensaje)) {
            // Construir contexto para GPT
            const contexto = fragmentosMaterialFiltrados.map(f => f.texto || f.text || f.contenido || '').join('\n').trim();
            // Prompt para GPT: respuesta natural, breve y clara SOLO usando el contexto
            const prompt = `Responde de forma clara, breve y natural usando SOLO la siguiente información interna. Si la respuesta no está en el contexto, responde: \"No tengo información sobre eso\".\n\nContexto:\n${contexto}\n\nPregunta: ${mensaje}`;
            respuestaBot = await obtenerRespuestaGPT(prompt);
            // Guardar el parafraseo y los fragmentos originales completos
            guardarEnHistorial(numeroLimpio, {
              respuesta: respuestaBot,
              contexto_fragmentos: fragmentosMaterialFiltrados.slice(0, 3) // Guardar fragmentos completos
            }, 'bot');
            return respuestaBot;
          }
          // --- FIN INTEGRACIÓN MATERIALES DE CURSO ---
          // --- INICIO FLUJO INTERACTIVO DE FUENTE BASADO EN HISTORIAL ---
          // 1. Si el usuario responde 'imagen', 'pdf' o 'no' tras una cita, procesar aquí
          const historial = leerHistorialUsuario(numeroLimpio).slice().reverse();
          const ultimaBotConCita = historial.find(h => h.tipo === 'bot' && h.mensaje && typeof h.mensaje === 'object' && h.mensaje.respuesta && h.mensaje.contexto_fragmentos && h.mensaje.cita_interactiva);
          if (ultimaBotConCita) {
            const contexto = ultimaBotConCita.mensaje.contexto_fragmentos;
            const cita = ultimaBotConCita.mensaje.cita_interactiva;
            const respuestaUsuario = mensaje.trim().toLowerCase();
            // Función auxiliar para buscar en todos los embeddings si no está en el contexto
            async function buscarFragmentoEnEmbeddings(archivo, pagina) {
              try {
                // Buscar en todos los archivos de embeddings de materiales
                const fsPromises = require('fs').promises;
                const embeddingsDir = path.join(__dirname, '../db/embeddings');
                console.log('DEBUG: embeddingsDir path:', embeddingsDir);
                const files = await fsPromises.readdir(embeddingsDir);
                console.log('DEBUG: Archivos en embeddingsDir:', files);
                for (const file of files) {
                  if (file.startsWith('embeddings_material_') && file.endsWith('.json')) {
                    const fullPath = path.join(embeddingsDir, file);
                    try {
                      const data = JSON.parse(await fsPromises.readFile(fullPath, 'utf8'));
                      // Puede ser array o {data: array}
                      const arr = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
                      console.log('DEBUG: Leyendo embeddings de', file, 'con', arr.length, 'fragmentos');
                      const frag = arr.find(f => f.archivo === archivo && String(f.pagina) === String(pagina));
                      if (frag) {
                        console.log('DEBUG: ¡Fragmento encontrado!', frag);
                        return frag;
                      }
                    } catch (e) { console.log('DEBUG: Error leyendo', fullPath, e); }
                  }
                }
                return null;
              } catch (e) {
                console.log('DEBUG: Error global en buscarFragmentoEnEmbeddings', e);
                return null;
              }
            }
            if (["imagen", "pdf", "no"].includes(respuestaUsuario)) {
              console.log('DEBUG: Entrando a búsqueda de imagen/pdf para cita', cita);
              if (respuestaUsuario === "no") {
                respuestaBot = 'Entendido, no enviaré ningún archivo. Si tienes otra consulta, dime.';
                guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
                return respuestaBot;
              }
              // Buscar el fragmento exacto en el contexto
              let fragmentoExacto = contexto.find(f => f.archivo === cita.archivo && String(f.pagina) === String(cita.pagina));
              // Si no está en el contexto, buscar en todos los embeddings
              if (!fragmentoExacto) {
                fragmentoExacto = await buscarFragmentoEnEmbeddings(cita.archivo, cita.pagina);
                if (!fragmentoExacto) {
                  console.log('DEBUG: No se encontró fragmento exacto para', cita);
                }
              }
              if (respuestaUsuario === "imagen") {
                if (fragmentoExacto && fragmentoExacto.imagen && fragmentoExacto.imagen.trim()) {
                  const rutaAbsoluta = path.join(
                    __dirname,
                    '../db/materiales_curso',
                    fragmentoExacto.imagen.replace(/\\/g, '/').replace(/^procesados[\\/]/, 'procesados/')
                  );
                  console.log('DEBUG rutaAbsoluta:', rutaAbsoluta, fs.existsSync(rutaAbsoluta));
                  if (fs.existsSync(rutaAbsoluta)) {
                    const media = MessageMedia.fromFilePath(rutaAbsoluta);
                    await client.sendMessage(numero, media, { caption: `Imagen de la página solicitada.\nArchivo: ${cita.archivo}\nPágina: ${cita.pagina}` });
                    respuestaBot = null;
                  } else {
                    respuestaBot = 'No se encontró la imagen exacta para esa página en el material mostrado.';
                  }
                } else {
                  respuestaBot = 'No se encontró la imagen exacta para esa página en el material mostrado.';
                }
                guardarEnHistorial(numeroLimpio, respuestaBot || 'Enviada imagen exacta', 'bot');
                return respuestaBot;
              } else if (respuestaUsuario === "pdf") {
                if (fragmentoExacto && fragmentoExacto.ruta_pdf && fragmentoExacto.ruta_pdf.trim()) {
                  const rutaAbsolutaPDF = path.join(
                    __dirname,
                    '../db/materiales_curso',
                    fragmentoExacto.ruta_pdf.replace(/\\/g, '/').replace(/^procesados[\\/]/, 'procesados/')
                  );
                  console.log('DEBUG rutaAbsolutaPDF:', rutaAbsolutaPDF, fs.existsSync(rutaAbsolutaPDF));
                  if (fs.existsSync(rutaAbsolutaPDF)) {
                    const mediaPDF = MessageMedia.fromFilePath(rutaAbsolutaPDF);
                    await client.sendMessage(numero, mediaPDF, { caption: `PDF de la página solicitada.\nArchivo: ${cita.archivo}\nPágina: ${cita.pagina}` });
                    respuestaBot = null;
                  } else {
                    respuestaBot = 'No se encontró el PDF exacto para esa página en el material mostrado.';
                  }
                } else {
                  respuestaBot = 'No se encontró el PDF exacto para esa página en el material mostrado.';
                }
                guardarEnHistorial(numeroLimpio, respuestaBot || 'Enviado PDF exacto', 'bot');
                return respuestaBot;
              }
            } else if (["sí", "si", "s", "ok", "dale", "claro", "por favor", "envíamelo", "envíame", "enviame", "porfa", "hazlo", "por supuesto", "vale", "yes", "please", "manda", "manda el pdf", "envía el pdf", "enviame el pdf", "envíame el pdf", "quiero el pdf", "quiero el archivo", "quiero el documento", "mándalo", "manda el archivo", "manda el documento", "de acuerdo", "está bien", "esta bien", "va", "hazlo"].includes(respuestaUsuario)) {
              respuestaBot = 'Por favor responde "imagen", "pdf" o "no".';
              guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
              return respuestaBot;
            }
          }
          // --- FIN FLUJO INTERACTIVO DE FUENTE BASADO EN HISTORIAL ---
          // --- INICIO FLUJO DE FUENTE SIMPLIFICADO ---
          const regexFuente = /(fuente|archivo fuente|de dónde sacaste|de donde sacaste|de dónde proviene|de donde proviene|de dónde obtuviste|de donde obtuviste|cita|origen|me puedes dar el archivo|dame el archivo|muéstrame la fuente|muestrame la fuente|de qué archivo|de que archivo|de qué material|de que material|de qué documento|de que documento)/i;
          if (regexFuente.test(mensaje)) {
            // Buscar en el historial la última respuesta del bot antes de la petición de fuente
            const historial = leerHistorialUsuario(numeroLimpio);
            let idx = historial.length - 1;
            // Buscar hacia atrás hasta encontrar el mensaje actual del usuario
            while (idx >= 0 && !(historial[idx].tipo === 'usuario' && historial[idx].mensaje === mensaje)) {
              idx--;
            }
            // Buscar la última respuesta del bot antes de la petición de fuente
            idx--;
            let fragmentosContexto = null;
            while (idx >= 0) {
              if (historial[idx].tipo === 'bot') {
                if (historial[idx].mensaje && typeof historial[idx].mensaje === 'object' && Array.isArray(historial[idx].mensaje.contexto_fragmentos)) {
                  fragmentosContexto = historial[idx].mensaje.contexto_fragmentos;
                  break;
                }
              }
              idx--;
            }
            // Si no se encuentra, usar el mensaje del usuario como fallback
            let fragmentos = null;
            if (fragmentosContexto && fragmentosContexto.length > 0) {
              fragmentos = fragmentosContexto;
            } else {
              // Fallback: buscar por el texto del usuario
              fragmentos = await buscarFragmentosRelevantes(mensaje, undefined, 5);
            }
            const fragmento = fragmentos.find(f => f.archivo && f.pagina);
            // --- INICIO MEJORA: Si el usuario pide explícitamente el PDF/archivo, enviar PDF directo si existe ---
            const regexFuentePDF = /(pdf|archivo|documento|el pdf|el archivo|el documento)/i;
            if (fragmento) {
              if (regexFuentePDF.test(mensaje)) {
                // El usuario pidió explícitamente el PDF/archivo
                if (fragmento.ruta_pdf && fragmento.ruta_pdf.trim()) {
                  const rutaAbsolutaPDF = path.join(
                    __dirname,
                    '../db/materiales_curso',
                    fragmento.ruta_pdf.replace(/\\/g, '/').replace(/^procesados[\\/]/, 'procesados/')
                  );
                  if (fs.existsSync(rutaAbsolutaPDF)) {
                    const mediaPDF = MessageMedia.fromFilePath(rutaAbsolutaPDF);
                    await client.sendMessage(numero, mediaPDF, { caption: `PDF de la página solicitada.\nArchivo: ${fragmento.archivo}\nPágina: ${fragmento.pagina}` });
                    respuestaBot = null;
                    guardarEnHistorial(numeroLimpio, `Enviado PDF fuente\nFuente: ${fragmento.archivo}, p. ${fragmento.pagina}`, 'bot');
                    return respuestaBot;
                  } else {
                    respuestaBot = 'No se encontró el archivo PDF exacto de la fuente. La respuesta fue parafraseada o compuesta a partir de varios fragmentos y no se puede dar una fuente exacta.';
                    guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
                    return respuestaBot;
                  }
                } else {
                  respuestaBot = 'No se encontró el archivo PDF exacto de la fuente. La respuesta fue parafraseada o compuesta a partir de varios fragmentos y no se puede dar una fuente exacta.';
                  guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
                  return respuestaBot;
                }
              }
              // --- FIN MEJORA PDF directo ---
              // Si tiene imagen, envía la imagen y la cita
              if (fragmento.imagen && fragmento.imagen.trim()) {
                const rutaAbsoluta = path.join(
                  __dirname,
                  '../db/materiales_curso',
                  fragmento.imagen.replace(/\\/g, '/').replace(/^procesados[\\/]/, 'procesados/')
                );
                if (fs.existsSync(rutaAbsoluta)) {
                  const media = MessageMedia.fromFilePath(rutaAbsoluta);
                  await client.sendMessage(numero, media, { caption: `Fuente: ${fragmento.archivo}, p. ${fragmento.pagina}` });
                  respuestaBot = null;
                  guardarEnHistorial(numeroLimpio, `Enviada imagen fuente\nFuente: ${fragmento.archivo}, p. ${fragmento.pagina}`, 'bot');
                  return respuestaBot;
                }
              }
              // Si no hay imagen pero hay PDF, pregunta si desea el PDF
              if (fragmento.ruta_pdf && fragmento.ruta_pdf.trim()) {
                respuestaBot = `No se encontró la imagen exacta, ¿deseas que te envíe el archivo PDF completo de donde proviene la información? Responde 'sí' o 'no'.\n\nFuente: ${fragmento.archivo}, p. ${fragmento.pagina}`;
                // Guardar en historial que se está esperando confirmación para PDF
                guardarEnHistorial(numeroLimpio, { respuesta: respuestaBot, contexto_fragmentos: [fragmento], cita_interactiva: { archivo: fragmento.archivo, pagina: fragmento.pagina }, esperando_pdf: true }, 'bot');
                return respuestaBot;
              }
              // Si no hay ni imagen ni PDF, responde que es parafraseo
              respuestaBot = 'La respuesta fue parafraseada a partir de varios fragmentos y no se puede dar una fuente exacta.';
              guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
              return respuestaBot;
            } else {
              respuestaBot = 'No se pudo identificar la fuente exacta de la información.';
              guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
              return respuestaBot;
            }
          }
          // --- FLUJO DE CONFIRMACIÓN DE PDF ---
          const historialPDF = leerHistorialUsuario(numeroLimpio).slice().reverse();
          const ultimaBotEsperandoPDF = historialPDF.find(h => h.tipo === 'bot' && h.mensaje && typeof h.mensaje === 'object' && h.mensaje.esperando_pdf);
          if (ultimaBotEsperandoPDF) {
            const contexto = ultimaBotEsperandoPDF.mensaje.contexto_fragmentos;
            const cita = ultimaBotEsperandoPDF.mensaje.cita_interactiva;
            const respuestaUsuario = mensaje.trim().toLowerCase();
            if (["sí", "si", "s", "ok", "dale", "claro", "por favor", "envíamelo", "envíame", "enviame", "porfa", "hazlo", "por supuesto", "vale", "yes", "please", "manda", "manda el pdf", "envía el pdf", "enviame el pdf", "envíame el pdf", "quiero el pdf", "quiero el archivo", "quiero el documento", "mándalo", "manda el archivo", "manda el documento", "de acuerdo", "está bien", "esta bien", "va", "hazlo"].includes(respuestaUsuario)) {
              // Buscar el fragmento exacto en el contexto
              const fragmentoExacto = contexto.find(f => f.archivo === cita.archivo && String(f.pagina) === String(cita.pagina));
              if (fragmentoExacto && fragmentoExacto.ruta_pdf && fragmentoExacto.ruta_pdf.trim()) {
                const rutaAbsolutaPDF = path.join(
                  __dirname,
                  '../db/materiales_curso',
                  fragmentoExacto.ruta_pdf.replace(/\\/g, '/').replace(/^procesados[\\/]/, 'procesados/')
                );
                if (fs.existsSync(rutaAbsolutaPDF)) {
                  const mediaPDF = MessageMedia.fromFilePath(rutaAbsolutaPDF);
                  await client.sendMessage(numero, mediaPDF, { caption: `PDF de la página solicitada.\nArchivo: ${cita.archivo}\nPágina: ${cita.pagina}` });
                  respuestaBot = null;
                  guardarEnHistorial(numeroLimpio, 'Enviado PDF exacto', 'bot');
                  return respuestaBot;
                } else {
                  respuestaBot = 'No se encontró el PDF exacto para esa página en el material mostrado.';
                  guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
                  return respuestaBot;
                }
              } else {
                respuestaBot = 'No se encontró el PDF exacto para esa página en el material mostrado.';
                guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
                return respuestaBot;
              }
            } else if (["no", "no gracias", "no quiero", "no deseo", "no por ahora", "gracias"].includes(respuestaUsuario)) {
              respuestaBot = 'Entendido, no enviaré el archivo. Si tienes otra consulta, dime.';
              guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
              return respuestaBot;
            } else {
              respuestaBot = 'Por favor responde "sí" o "no" para saber si deseas el PDF.';
              guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
              return respuestaBot;
            }
          }
          // --- FIN FLUJO DE FUENTE SIMPLIFICADO ---
          // 1. Preguntas generales sobre la malla curricular
          const respuestaGeneral = responderPreguntaGeneralMalla(mensaje);
          if (respuestaGeneral) {
            respuestaBot = respuestaGeneral;
          } else {
            // 2. Preguntas de relación/requisito (¿Qué cursos requieren X? ¿Qué cursos tienen como requisito X? ¿Qué cursos se pueden llevar después de X?)
            const patronRequieren = /qué\s+cursos?\s+(requieren|tienen\s+como\s+requisito|se\s+pueden\s+llevar\s+después\s+de)\s+(?:haber\s+aprobado\s+)?(.+?)(\?|$)/i;
            const matchRel = mensaje.match(patronRequieren);
            if (matchRel) {
              const nombreCurso = matchRel[2].trim();
              const cursosRelacionados = buscarCursosQueTienenComoRequisito(nombreCurso);
              if (cursosRelacionados.length > 0) {
                respuestaBot = `Los cursos que requieren "${nombreCurso}" como requisito son:\n${cursosRelacionados.join('\n')}`;
              } else {
                respuestaBot = `Ningún curso requiere "${nombreCurso}" como requisito.`;
              }
            } else {
              // 3. Dependencias inversas: ¿Qué cursos dependen de X?
              const patronDependen = /qué\s+cursos?\s+dependen\s+de\s+(.+?)(\?|$)/i;
              const matchDep = mensaje.match(patronDependen);
              if (matchDep) {
                const nombreCurso = matchDep[1].trim();
                const dependientes = buscarCursosDependientes(nombreCurso);
                if (dependientes.length > 0) {
                  respuestaBot = `Los cursos que dependen de "${nombreCurso}" son:\n${dependientes.join('\n')}`;
                } else {
                  respuestaBot = `Ningún curso depende de "${nombreCurso}".`;
                }
              } else {
                // 4. Inicio de malla: ¿Qué cursos son el inicio de la malla?
                if (/inicio\s+de\s+la\s+malla|cursos?\s+del\s+primer\s+semestre/i.test(mensaje)) {
                  const inicio = cursosInicioMalla();
                  respuestaBot = `Los cursos del primer semestre (inicio de la malla) son:\n${inicio.join('\n')}`;
                } else if (/cursos?\s+con\s+m[aá]s\s+prerrequisitos?/i.test(mensaje)) {
                  // 5. Cursos con más prerrequisitos
                  const top = cursosConMasPrerrequisitos();
                  respuestaBot = `Los cursos con más prerrequisitos en la malla son:\n${top.join('\n')}`;
                } else if (/ingenier[íi]a\s+de\s+sistemas?\s+de?\s+informaci[oó]n/i.test(mensaje) && 
                           !/(docente|profesor|maestro|instructor|horario|horarios|hora|horas|día|días|aula|aulas|salón|salones|teoría|práctica|laboratorio|sesión|sesiones|piso|pisos|inicio|fin|termina|empieza|ciclo|código|codigo|semestre|sección|seccion)/i.test(mensaje)) {
                  // 6. Priorizar detalles para Ingeniería de Sistemas de Información (solo si NO es pregunta sobre horarios)
                  const curso = buscarCursoPorNombreAproximado('Ingeniería de Sistemas de Información');
                  if (curso) {
                    let detalles = `Curso ${curso.numero}: ${curso.nombre}\nSemestre: ${curso.semestre}\nCréditos: ${curso.creditos}\nTipo: ${curso.tipo}`;
                    if (curso.requisitos && curso.requisitos.length > 0) {
                      detalles += `\nPrerrequisitos: ${curso.requisitos.join(', ')}`;
                    } else {
                      detalles += `\nNo tiene prerrequisitos.`;
                    }
                    const dependientes = buscarCursosDependientes('Ingeniería de Sistemas de Información');
                    if (dependientes.length > 0) {
                      detalles += `\nCursos que dependen de este curso:\n${dependientes.join('\n')}`;
                    }
                    respuestaBot = detalles;
                  } else {
                    respuestaBot = 'No se encontró información detallada sobre el curso Ingeniería de Sistemas de Información.';
                  }
                } else {
                  // 7. Consultas de unidad y búsqueda semántica tradicional
                  const infoUnidad = buscarInformacionUnidad(mensaje);
                  if (infoUnidad) {
                    if (infoUnidad.error) {
                      respuestaBot = `❌ ${infoUnidad.error}. El curso tiene 4 unidades (1-4). ¿Podrías consultar sobre una unidad válida?`;
                      console.log(`❌ Unidad no encontrada: ${infoUnidad.error}`);
                    } else if (infoUnidad.tipo === 'unidad') {
                      const unidad = infoUnidad.unidad;
                      const temas = unidad.semanas.map(semana => ({
                        semana: semana.semana,
                        contenido_tematico: semana.contenido_tematico,
                        sesiones: semana.sesiones,
                        evidencia: semana.evidencia
                      }));
                      respuestaBot = `📚 **Unidad ${infoUnidad.numeroUnidad}: ${unidad.titulo}**\n\n` +
                                    `🎯 **Logro de aprendizaje:** ${unidad.logro_aprendizaje}\n\n` +
                                    `📅 **Temas por semana:**\n\n` +
                                    temas.map(t => 
                                      `**Semana ${t.semana}:** ${t.contenido_tematico}\n` +
                                      `• Sesiones: ${Array.isArray(t.sesiones) ? t.sesiones.join(', ') : t.sesiones || 'No especificadas'}\n` +
                                      `• Evidencia: ${t.evidencia || 'No especificada'}`
                                    ).join('\n\n');
                      console.log(`✅ Respuesta directa para unidad ${infoUnidad.numeroUnidad}`);
                    }
                  } else {
                    // Búsqueda semántica tradicional
                    const fragmentos = await buscarFragmentosRelevantes(mensaje, undefined, 5);
                    console.log('🔍 Fragmentos encontrados:', fragmentos.length);
                    console.log('�� Fragmentos y similitud:', fragmentos.map(f => ({ 
                      id: f.id || 'sin_id',
                      texto: (f.text || f.texto || f.contenido || 'Sin texto').slice(0, 80), 
                      similitud: f.similitud,
                      fuente: f.fuente || 'sin_fuente'
                    })));
                    const fragmentosFiltrados = fragmentos.filter(f => f.similitud >= UMBRAL_SIMILITUD);
                    console.log('✅ Fragmentos que superan umbral:', fragmentosFiltrados.length);
                    
                    // Verificar si hay fragmentos de horarios con similitud aceptable
                    const fragmentosHorarios = fragmentosFiltrados.filter(f => f.fuente === 'HorariosCursos.json' && f.similitud > 0.3);
                    
                    if (fragmentosHorarios.length > 0) {
                      // Para preguntas específicas sobre datos del curso, priorizar el fragmento general
                      let fragmentoHorarios;
                      if (/ciclo|código|codigo|semestre|sección|seccion/i.test(mensaje)) {
                        // Buscar el fragmento general que contiene toda la información del curso
                        fragmentoHorarios = fragmentosHorarios.find(f => f.id === 'horarios_curso_sistemas_general');
                        if (!fragmentoHorarios) {
                          fragmentoHorarios = fragmentosHorarios[0]; // Fallback al más relevante
                        }
                      } else {
                        fragmentoHorarios = fragmentosHorarios[0]; // Tomar el más relevante para otras preguntas
                      }
                      
                      const contenido = fragmentoHorarios.contenido || fragmentoHorarios.texto || fragmentoHorarios.text;
                      
                      // Crear un prompt más específico basado en el tipo de pregunta
                      let prompt;
                      if (/ciclo/i.test(mensaje)) {
                        prompt = `Extrae SOLO el número del ciclo de esta información y responde de forma directa.

Información:
${contenido}

Pregunta: ${mensaje}

Responde solo con el número del ciclo (ej: "VII" o "7").`;
                      } else if (/código|codigo/i.test(mensaje)) {
                        prompt = `Extrae SOLO el código del curso de esta información y responde de forma directa.

Información:
${contenido}

Pregunta: ${mensaje}

Responde solo con el código del curso.`;
                      } else if (/semestre/i.test(mensaje)) {
                        prompt = `Extrae el semestre académico de esta información y responde de forma clara pero concisa.

Información:
${contenido}

Pregunta: ${mensaje}

Responde con "Semestre académico: [valor]" (ej: "Semestre académico: 2025-I").`;
                      } else if (/sección|seccion/i.test(mensaje)) {
                        prompt = `Extrae SOLO la sección del curso de esta información y responde de forma directa.

Información:
${contenido}

Pregunta: ${mensaje}

Responde solo con la sección (ej: "B").`;
                      } else {
                        prompt = `Responde de forma directa y natural usando SOLO esta información. Sé breve y directo, sin ser muy formal.

Información:
${contenido}

Pregunta: ${mensaje}

Responde de manera simple y directa.`;
                      }
                      
                      respuestaBot = await obtenerRespuestaGPT(prompt);
                      // Guardar los fragmentos top usados como contexto junto con la respuesta
                      // Para esto, guardamos en el historial un objeto especial
                      guardarEnHistorial(numeroLimpio, {
                        respuesta: respuestaBot,
                        contexto_fragmentos: fragmentosFiltrados.slice(0, 3).map(f => ({
                          archivo: f.archivo,
                          pagina: f.pagina,
                          cita: f.cita,
                          texto: (f.texto || f.text || f.contenido || '').slice(0, 120)
                        }))
                      }, 'bot');
                      return respuestaBot;
                    } else {
                      // Búsqueda semántica tradicional para otros casos
                      const contexto = fragmentosFiltrados.map(f => f.text || f.texto || f.contenido || '').join('\n').trim();
                      if (fragmentosFiltrados.length === 0 || !contexto) {
                        respuestaBot = '❓ No tengo información sobre eso en mi base de datos interna.';
                      } else {
                        const prompt = `Responde SOLO usando la siguiente información interna. Si la respuesta no está en el contexto, responde: "No tengo información sobre eso".\n\nContexto:\n${contexto}\n\nPregunta: ${mensaje}`;
                        respuestaBot = await obtenerRespuestaGPT(prompt);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error al manejar el mensaje:', error);
        respuestaBot = `Lo siento, hubo un error al procesar tu mensaje.`;
      }
    }
  }

  // 5. Guardar la respuesta del bot en el historial
  guardarEnHistorial(numeroLimpio, respuestaBot, 'bot');
  return respuestaBot;
}

module.exports = {
  manejarMensaje,
}; 