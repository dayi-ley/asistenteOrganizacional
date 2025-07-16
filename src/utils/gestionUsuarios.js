const { getDB } = require('../db/ConfiguracionBaseDatos');
const fs = require('fs');
const path = require('path');

const dbUsuarios = getDB('usuarios_sistema/BaseDatosUsuarios.json');
const dbHistorial = getDB('usuarios_sistema/HistorialInteracciones.json');

dbUsuarios.defaults({ usuarios: [] }).write();
dbHistorial.defaults({ historial: [] }).write();

/**
 * Busca un usuario por número. Solo busca en usuarios existentes, NO crea nuevos.
 * @param {string} numero - Número de teléfono del usuario.
 * @returns {object|null} El usuario encontrado o null si no existe.
 */
function identificarUsuario(numero) {
  console.log(`🔍 Buscando usuario con número: ${numero}`);
  
  // Buscar por numero_whatsapp (usuarios del JSON original)
  let usuario = dbUsuarios.get('usuarios').find({ numero_whatsapp: `+${numero}` }).value();
  
  if (usuario) {
    console.log(`✅ Usuario encontrado: ${usuario.nombre.nombres}`);
    return usuario;
  }
  
  // Si no encuentra, buscar por numero (usuarios ya creados anteriormente)
  usuario = dbUsuarios.get('usuarios').find({ numero: numero }).value();
  
  if (usuario) {
    console.log(`⚠️ Usuario encontrado (sin datos completos): ${usuario.numero}`);
    return usuario;
  }
  
  // Si no encuentra nada, NO crear usuario nuevo
  console.log(`❌ Usuario no encontrado en la base de datos`);
  return null;
}

/**
 * Guarda una interacción en el historial individual del usuario.
 * @param {string} numero - Número de teléfono del usuario.
 * @param {string} mensaje - Mensaje recibido o enviado.
 * @param {string} tipo - 'usuario' o 'bot'
 */
function guardarEnHistorial(numero, mensaje, tipo = 'usuario') {
  // Buscar usuario para obtener su id
  let usuario = dbUsuarios.get('usuarios').find({ numero_whatsapp: `+${numero}` }).value();
  if (!usuario) {
    usuario = dbUsuarios.get('usuarios').find({ numero: numero }).value();
  }
  // Usar id si existe, si no, el número limpio
  const id = usuario && usuario.id ? usuario.id : numero;
  const historialPath = path.join(__dirname, '../db/usuarios_sistema/historiales', `${id}.json`);
  let historial = [];
  if (fs.existsSync(historialPath)) {
    try {
      historial = JSON.parse(fs.readFileSync(historialPath, 'utf8'));
    } catch (e) { historial = []; }
  }
  historial.push({
    tipo,
    mensaje,
    fecha: new Date().toISOString()
  });
  fs.writeFileSync(historialPath, JSON.stringify(historial, null, 2), 'utf8');
}

/**
 * Lee el historial individual del usuario.
 * @param {string} numero - Número de teléfono del usuario.
 * @returns {Array} Historial de interacciones
 */
function leerHistorialUsuario(numero) {
  let usuario = dbUsuarios.get('usuarios').find({ numero_whatsapp: `+${numero}` }).value();
  if (!usuario) {
    usuario = dbUsuarios.get('usuarios').find({ numero: numero }).value();
  }
  const id = usuario && usuario.id ? usuario.id : numero;
  const historialPath = path.join(__dirname, '../db/usuarios_sistema/historiales', `${id}.json`);
  if (fs.existsSync(historialPath)) {
    try {
      return JSON.parse(fs.readFileSync(historialPath, 'utf8'));
    } catch (e) { return []; }
  }
  return [];
}

module.exports = {
  identificarUsuario,
  guardarEnHistorial,
  leerHistorialUsuario
}; 