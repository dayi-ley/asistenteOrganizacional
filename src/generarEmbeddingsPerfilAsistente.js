const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generarEmbedding(texto) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texto,
      encoding_format: 'float'
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generando embedding:', error);
    throw error;
  }
}

async function generarEmbeddingsPerfilAsistente() {
  try {
    console.log('🔄 Generando embeddings para el perfil del asistente...');
    const embeddings = [];
    const perfil = JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'perfil_asistente', 'PerfilAsistente.json'), 'utf8'));

    // 1. Descripción general
    const textoDescripcion = `Descripción del asistente: ${perfil.descripcion}`;
    embeddings.push({
      texto: textoDescripcion,
      embedding: await generarEmbedding(textoDescripcion),
      tipo: 'descripcion',
      fuente: 'PerfilAsistente.json'
    });

    // 1.1 Origen y significado del nombre
    if (perfil.origen_nombre) {
      if (perfil.origen_nombre.significado) {
        const textoSignificado = `Significado del nombre ISIUX: ${perfil.origen_nombre.significado}`;
        embeddings.push({
          texto: textoSignificado,
          embedding: await generarEmbedding(textoSignificado),
          tipo: 'origen_nombre_significado',
          fuente: 'PerfilAsistente.json'
        });
      }
      if (perfil.origen_nombre.explicacion) {
        const textoExplicacion = `Explicación del origen del nombre ISIUX: ${perfil.origen_nombre.explicacion}`;
        embeddings.push({
          texto: textoExplicacion,
          embedding: await generarEmbedding(textoExplicacion),
          tipo: 'origen_nombre_explicacion',
          fuente: 'PerfilAsistente.json'
        });
      }
    }

    // 1.2 Información general
    if (perfil.informacion_general) {
      for (const [clave, valor] of Object.entries(perfil.informacion_general)) {
        const textoInfoGen = `Información general (${clave}): ${valor}`;
        embeddings.push({
          texto: textoInfoGen,
          embedding: await generarEmbedding(textoInfoGen),
          tipo: `informacion_general_${clave}`,
          fuente: 'PerfilAsistente.json'
        });
      }
    }

    // 2. Propósito (legacy, por compatibilidad)
    if (perfil.proposito) {
      const textoProposito = `Propósito del asistente: ${perfil.proposito}`;
      embeddings.push({
        texto: textoProposito,
        embedding: await generarEmbedding(textoProposito),
        tipo: 'proposito',
        fuente: 'PerfilAsistente.json'
      });
    }

    // 3. Funcionalidades
    if (perfil.funcionalidades) {
      const textoFuncionalidades = `Funcionalidades del asistente: ${perfil.funcionalidades.join('; ')}`;
      embeddings.push({
        texto: textoFuncionalidades,
        embedding: await generarEmbedding(textoFuncionalidades),
        tipo: 'funcionalidades',
        fuente: 'PerfilAsistente.json'
      });
    }

    // 4. Personalidad
    if (perfil.personalidad) {
      const textoPersonalidad = `Personalidad del asistente: ${perfil.personalidad.tipo}, tono: ${perfil.personalidad.tono}, características: ${perfil.personalidad.caracteristicas.join('; ')}`;
      embeddings.push({
        texto: textoPersonalidad,
        embedding: await generarEmbedding(textoPersonalidad),
        tipo: 'personalidad',
        fuente: 'PerfilAsistente.json'
      });
    }

    // 5. Preguntas frecuentes
    if (perfil.preguntas_frecuentes) {
      const textoFAQ = `Preguntas frecuentes sobre el asistente: ${perfil.preguntas_frecuentes.join('; ')}`;
      embeddings.push({
        texto: textoFAQ,
        embedding: await generarEmbedding(textoFAQ),
        tipo: 'faq',
        fuente: 'PerfilAsistente.json'
      });
    }

    // 6. Respuestas modelo (mejorado: solo la respuesta, pero con contexto explícito)
    if (perfil.respuestas_modelo) {
      for (const [pregunta, respuesta] of Object.entries(perfil.respuestas_modelo)) {
        let contexto = '';
        // Detectar contexto por palabras clave en la pregunta
        if (/cread[oa]|fecha/i.test(pregunta)) {
          contexto = 'Fecha de creación de ISIUX: ';
        } else if (/secci[oó]n|seccion/i.test(pregunta)) {
          contexto = 'Sección a la que asiste ISIUX: ';
        } else if (/curso/i.test(pregunta)) {
          contexto = 'Curso al que ayuda ISIUX: ';
        } else if (/plataforma/i.test(pregunta)) {
          contexto = 'Plataforma para la que fue creado ISIUX: ';
        } else if (/versi[oó]n|version/i.test(pregunta)) {
          contexto = 'Versión de ISIUX: ';
        } else if (/prop[oó]sito|sirves|funci[oó]n/i.test(pregunta)) {
          contexto = 'Propósito de ISIUX: ';
        } else if (/nombre|significa/i.test(pregunta)) {
          contexto = 'Significado del nombre ISIUX: ';
        } else if (/atiende|ayuda|usuarios|qu[ié]n|quienes/i.test(pregunta)) {
          contexto = 'Usuarios a los que atiende ISIUX: ';
        } else if (/estado/i.test(pregunta)) {
          contexto = 'Estado de ISIUX: ';
        } else if (/humano/i.test(pregunta)) {
          contexto = '¿ISIUX es un humano?: ';
        } else if (/emociones/i.test(pregunta)) {
          contexto = '¿ISIUX tiene emociones?: ';
        } else if (/aprend/i.test(pregunta)) {
          contexto = '¿Cómo aprende ISIUX?: ';
        } else if (/puedes|funciones|hacer/i.test(pregunta)) {
          contexto = '¿Qué puede hacer ISIUX?: ';
        }
        // Si no se detecta contexto, dejar solo la respuesta
        const textoResp = contexto + respuesta;
        embeddings.push({
          texto: textoResp,
          embedding: await generarEmbedding(textoResp),
          tipo: 'respuesta_modelo',
          fuente: 'PerfilAsistente.json'
        });
      }
    }

    // 7. Ejemplos de interacción
    if (perfil.ejemplos_interaccion) {
      for (const ejemplo of perfil.ejemplos_interaccion) {
        embeddings.push({
          texto: ejemplo,
          embedding: await generarEmbedding(ejemplo),
          tipo: 'ejemplo_interaccion',
          fuente: 'PerfilAsistente.json'
        });
      }
    }

    // Guardar embeddings
    const rutaEmbeddings = path.join(__dirname, 'db', 'embeddings', 'perfil_asistente_embeddings.json');
    fs.writeFileSync(rutaEmbeddings, JSON.stringify(embeddings, null, 2));
    console.log(`✅ Embeddings de perfil del asistente generados exitosamente: ${embeddings.length} embeddings`);
    console.log(`📁 Guardados en: ${rutaEmbeddings}`);
  } catch (error) {
    console.error('❌ Error generando embeddings de perfil del asistente:', error);
  }
}

if (require.main === module) {
  generarEmbeddingsPerfilAsistente();
}

module.exports = { generarEmbeddingsPerfilAsistente }; 