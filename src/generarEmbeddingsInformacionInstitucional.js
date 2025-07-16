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

async function generarEmbeddingsInformacionInstitucional() {
  try {
    console.log('🔄 Generando embeddings para información institucional...');
    const embeddings = [];

    // ----------- INFORMACION CARRERA -----------
    const infoCarrera = JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'informacion_institucional', 'InformacionCarrera.json'), 'utf8'));
    // Descripción general
    embeddings.push({
      texto: `Carrera: ${infoCarrera.nombre}. Facultad: ${infoCarrera.facultad_id}. Ejemplo de preguntas: ¿Qué carrera es? ¿Cuál es la carrera? ¿A qué facultad pertenece la carrera?`,
      embedding: await generarEmbedding(`Carrera: ${infoCarrera.nombre}. Facultad: ${infoCarrera.facultad_id}. Ejemplo de preguntas: ¿Qué carrera es? ¿Cuál es la carrera? ¿A qué facultad pertenece la carrera?`),
      tipo: 'carrera_general'
    });
    // Perfil ingresante
    for (const [dim, items] of Object.entries(infoCarrera.perfil_ingresante)) {
      embeddings.push({
        texto: `Perfil del ingresante (${dim}): ${items.join(' ')}. Ejemplo de preguntas: ¿Cuál es el perfil del ingresante? ¿Qué debe tener un estudiante que ingresa? ¿Cuáles son las características del ingresante?`,
        embedding: await generarEmbedding(`Perfil del ingresante (${dim}): ${items.join(' ')}. Ejemplo de preguntas: ¿Cuál es el perfil del ingresante? ¿Qué debe tener un estudiante que ingresa? ¿Cuáles son las características del ingresante?`),
        tipo: `carrera_perfil_ingresante_${dim}`
      });
    }
    // Perfil graduado
    for (const [dim, items] of Object.entries(infoCarrera.perfil_graduado)) {
      embeddings.push({
        texto: `Perfil del graduado (${dim}): ${items.join(' ')}. Ejemplo de preguntas: ¿Cuál es el perfil del egresado? ¿Qué competencias tiene un graduado? ¿Qué habilidades desarrolla un egresado?`,
        embedding: await generarEmbedding(`Perfil del graduado (${dim}): ${items.join(' ')}. Ejemplo de preguntas: ¿Cuál es el perfil del egresado? ¿Qué competencias tiene un graduado? ¿Qué habilidades desarrolla un egresado?`),
        tipo: `carrera_perfil_graduado_${dim}`
      });
    }
    // Campo laboral
    embeddings.push({
      texto: `Campo laboral de la carrera: ${infoCarrera.campo_laboral.join(' ')}. Ejemplo de preguntas: ¿En qué puede trabajar un egresado? ¿Cuál es el campo laboral? ¿Dónde puede trabajar un graduado?`,
      embedding: await generarEmbedding(`Campo laboral de la carrera: ${infoCarrera.campo_laboral.join(' ')}. Ejemplo de preguntas: ¿En qué puede trabajar un egresado? ¿Cuál es el campo laboral? ¿Dónde puede trabajar un graduado?`),
      tipo: 'carrera_campo_laboral'
    });
    // Responsable
    embeddings.push({
      texto: `Responsable de la carrera: ${infoCarrera.responsable.nombre}, correo: ${infoCarrera.responsable.correo}, anexo: ${infoCarrera.responsable.anexo}. Ejemplo de preguntas: ¿Quién es el responsable de la carrera? ¿Cómo contacto al responsable? ¿Quién dirige la carrera?`,
      embedding: await generarEmbedding(`Responsable de la carrera: ${infoCarrera.responsable.nombre}, correo: ${infoCarrera.responsable.correo}, anexo: ${infoCarrera.responsable.anexo}. Ejemplo de preguntas: ¿Quién es el responsable de la carrera? ¿Cómo contacto al responsable? ¿Quién dirige la carrera?`),
      tipo: 'carrera_responsable'
    });

    // ----------- INFORMACION FACULTAD -----------
    const infoFacultad = JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'informacion_institucional', 'InformacionFacultad.json'), 'utf8'));
    // Descripción general
    embeddings.push({
      texto: `Facultad: ${infoFacultad.nombre}. Universidad: ${infoFacultad.universidad}. Descripción: ${infoFacultad.descripcion}. Ejemplo de preguntas: ¿A qué universidad pertenece la FIEI? ¿Cuál es la universidad de la FIEI? ¿Qué es la FIEI?`,
      embedding: await generarEmbedding(`Facultad: ${infoFacultad.nombre}. Universidad: ${infoFacultad.universidad}. Descripción: ${infoFacultad.descripcion}. Ejemplo de preguntas: ¿A qué universidad pertenece la FIEI? ¿Cuál es la universidad de la FIEI? ¿Qué es la FIEI?`),
      tipo: 'facultad_general'
    });
    // Fecha de creación y aniversario
    embeddings.push({
      texto: `La FIEI se creó el ${infoFacultad.fecha_creacion} y su aniversario es el ${infoFacultad.aniversario}. Ejemplo de preguntas: ¿Cuándo se creó la FIEI? ¿Cuándo es el aniversario de la facultad? ¿Qué fecha se fundó la FIEI?`,
      embedding: await generarEmbedding(`La FIEI se creó el ${infoFacultad.fecha_creacion} y su aniversario es el ${infoFacultad.aniversario}. Ejemplo de preguntas: ¿Cuándo se creó la FIEI? ¿Cuándo es el aniversario de la facultad? ¿Qué fecha se fundó la FIEI?`),
      tipo: 'facultad_fecha_creacion'
    });
    // Autoridades
    for (const [cargo, datos] of Object.entries(infoFacultad.autoridades)) {
      embeddings.push({
        texto: `Autoridad (${cargo}): ${datos.nombre}, correo: ${datos.correo}, anexo: ${datos.anexo}. Ejemplo de preguntas: ¿Quién es el ${cargo}? ¿Cuál es el correo del ${cargo}? ¿Cómo contacto al ${cargo}?`,
        embedding: await generarEmbedding(`Autoridad (${cargo}): ${datos.nombre}, correo: ${datos.correo}, anexo: ${datos.anexo}. Ejemplo de preguntas: ¿Quién es el ${cargo}? ¿Cuál es el correo del ${cargo}? ¿Cómo contacto al ${cargo}?`),
        tipo: `facultad_autoridad_${cargo}`
      });
    }
    // Escuelas profesionales
    for (const escuela of infoFacultad.escuelas_profesionales) {
      embeddings.push({
        texto: `Escuela profesional: ${escuela.nombre}. Responsable: ${escuela.responsable}, correo: ${escuela.correo}, anexo: ${escuela.anexo}. Ejemplo de preguntas: ¿Qué escuelas tiene la FIEI? ¿Quién dirige ${escuela.nombre}? ¿Cómo contacto a ${escuela.nombre}?`,
        embedding: await generarEmbedding(`Escuela profesional: ${escuela.nombre}. Responsable: ${escuela.responsable}, correo: ${escuela.correo}, anexo: ${escuela.anexo}. Ejemplo de preguntas: ¿Qué escuelas tiene la FIEI? ¿Quién dirige ${escuela.nombre}? ¿Cómo contacto a ${escuela.nombre}?`),
        tipo: `facultad_escuela_${escuela.id}`
      });
    }
    // Otras oficinas
    for (const oficina of infoFacultad.otras_oficinas) {
      embeddings.push({
        texto: `Oficina: ${oficina.nombre}. Responsable: ${oficina.responsable}, correo: ${oficina.correo}, anexo: ${oficina.anexo}. Ejemplo de preguntas: ¿Cómo contacto a ${oficina.nombre}? ¿Quién dirige ${oficina.nombre}? ¿Cuál es el correo de ${oficina.nombre}?`,
        embedding: await generarEmbedding(`Oficina: ${oficina.nombre}. Responsable: ${oficina.responsable}, correo: ${oficina.correo}, anexo: ${oficina.anexo}. Ejemplo de preguntas: ¿Cómo contacto a ${oficina.nombre}? ¿Quién dirige ${oficina.nombre}? ¿Cuál es el correo de ${oficina.nombre}?`),
        tipo: `facultad_oficina_${oficina.nombre.replace(/\s+/g, '_').toLowerCase()}`
      });
    }
    // Contacto
    embeddings.push({
      texto: `Contacto de la facultad: Dirección: ${infoFacultad.contacto.direccion}, Teléfono: ${infoFacultad.contacto.telefono}, Anexos: ${infoFacultad.contacto.anexos.join(', ')}. Ejemplo de preguntas: ¿Cuál es la dirección de la FIEI? ¿Cuál es el teléfono de la facultad? ¿Dónde queda la FIEI?`,
      embedding: await generarEmbedding(`Contacto de la facultad: Dirección: ${infoFacultad.contacto.direccion}, Teléfono: ${infoFacultad.contacto.telefono}, Anexos: ${infoFacultad.contacto.anexos.join(', ')}. Ejemplo de preguntas: ¿Cuál es la dirección de la FIEI? ¿Cuál es el teléfono de la facultad? ¿Dónde queda la FIEI?`),
      tipo: 'facultad_contacto'
    });
    // Historial destacado
    for (const h of infoFacultad.historial_destacado) {
      embeddings.push({
        texto: `Logros destacados en ${h.anio}: ${h.logros.join(' ')}. Ejemplo de preguntas: ¿Qué logros tuvo la facultad en ${h.anio}? ¿Qué destacó la FIEI en ${h.anio}? ¿Cuáles fueron los logros de ${h.anio}?`,
        embedding: await generarEmbedding(`Logros destacados en ${h.anio}: ${h.logros.join(' ')}. Ejemplo de preguntas: ¿Qué logros tuvo la facultad en ${h.anio}? ¿Qué destacó la FIEI en ${h.anio}? ¿Cuáles fueron los logros de ${h.anio}?`),
        tipo: `facultad_logros_${h.anio}`
      });
    }
    // Proyectos en curso
    for (const p of infoFacultad.proyectos_en_curso) {
      embeddings.push({
        texto: `Proyecto en curso: ${p.nombre}. Descripción: ${p.descripcion}. Estado: ${p.estado}. Fecha inicio estimado: ${p.fecha_inicio_estimado}. Ejemplo de preguntas: ¿Qué proyectos tiene la FIEI? ¿De qué trata ${p.nombre}? ¿Cuál es el estado de ${p.nombre}?`,
        embedding: await generarEmbedding(`Proyecto en curso: ${p.nombre}. Descripción: ${p.descripcion}. Estado: ${p.estado}. Fecha inicio estimado: ${p.fecha_inicio_estimado}. Ejemplo de preguntas: ¿Qué proyectos tiene la FIEI? ¿De qué trata ${p.nombre}? ¿Cuál es el estado de ${p.nombre}?`),
        tipo: `facultad_proyecto_${p.nombre.replace(/\s+/g, '_').toLowerCase()}`
      });
    }

    // Guardar embeddings
    const rutaEmbeddings = path.join(__dirname, 'db', 'embeddings', 'informacion_institucional_embeddings.json');
    fs.writeFileSync(rutaEmbeddings, JSON.stringify(embeddings, null, 2));
    console.log(`✅ Embeddings de información institucional generados exitosamente: ${embeddings.length} embeddings`);
    console.log(`📁 Guardados en: ${rutaEmbeddings}`);
  } catch (error) {
    console.error('❌ Error generando embeddings de información institucional:', error);
  }
}

if (require.main === module) {
  generarEmbeddingsInformacionInstitucional();
}

module.exports = { generarEmbeddingsInformacionInstitucional }; 