require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Obtiene una respuesta de GPT dado un prompt y un historial opcional.
 * @param {string} prompt - El mensaje del usuario.
 * @param {Array} historial - Historial de mensajes (opcional, formato OpenAI).
 * @returns {Promise<string>} Respuesta generada por GPT.
 */
async function obtenerRespuestaGPT(prompt, historial = []) {
  const messages = [
    ...historial,
    { role: 'user', content: prompt }
  ];
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    max_tokens: 300,
    temperature: 0.7,
  });
  return response.choices[0].message.content.trim();
}

module.exports = { obtenerRespuestaGPT }; 