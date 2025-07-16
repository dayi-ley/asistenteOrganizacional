const { buscarFragmentosRelevantes } = require('./src/utils/busquedaSemantica');
const path = require('path');

async function testBusquedaMaterial() {
  const pregunta = process.argv[2] || '¿Qué es un sistema de información?';
  const embeddingsPath = path.join(__dirname, 'src/db/embeddings/embeddings_material_semana_01_01IngSistemas.json');

  console.log(`\n📝 Pregunta: ${pregunta}\n`);
  const resultados = await buscarFragmentosRelevantes(pregunta, embeddingsPath, 3);

  resultados.forEach((frag, idx) => {
    console.log(`--- Fragmento #${idx + 1} ---`);
    console.log(`Similitud: ${frag.similitud.toFixed(4)}`);
    console.log(`Archivo: ${frag.archivo}`);
    console.log(`Página: ${frag.pagina}`);
    console.log(`Imagen: ${frag.imagen}`);
    console.log(`Ruta PDF: ${frag.ruta_pdf}`);
    console.log(`Texto: ${frag.texto.substring(0, 300)}...`);
    console.log('-------------------------\n');
  });
}

testBusquedaMaterial().catch(console.error); 