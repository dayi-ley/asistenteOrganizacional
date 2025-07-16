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

async function generarEmbeddingsMaterial() {
  try {
    const archivoEstructurado = path.join(__dirname, '../../db/materiales_curso/estructurados/semana_01/01 Ing Sistemas de Informacion V2_final.json');
    const data = JSON.parse(fs.readFileSync(archivoEstructurado, 'utf8'));
    const embeddings = [];
    const fragmentos = data.fragmentos || [];

    for (const frag of fragmentos) {
      const texto = frag.fragmento;
      const embedding = await generarEmbedding(texto);
      embeddings.push({
        semana: frag.semana,
        archivo: frag.archivo,
        pagina: frag.pagina,
        imagen: frag.imagen,
        ruta_pdf: frag.ruta_pdf,
        texto: texto,
        embedding: embedding
      });
      console.log(`✅ Embedding generado para página ${frag.pagina} (${frag.archivo})`);
    }

    const rutaSalida = path.join(__dirname, '../../db/embeddings/embeddings_material_semana_01_01IngSistemas.json');
    fs.writeFileSync(rutaSalida, JSON.stringify(embeddings, null, 2));
    console.log(`\n✅ Embeddings generados y guardados en: ${rutaSalida}`);
  } catch (error) {
    console.error('❌ Error generando embeddings de materiales:', error);
  }
}

if (require.main === module) {
  generarEmbeddingsMaterial();
}

module.exports = { generarEmbeddingsMaterial }; 