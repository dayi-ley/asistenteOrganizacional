const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

/**
 * Obtiene una instancia de lowdb para un archivo JSON dado.
 * @param {string} relativePath - Ruta relativa desde src/db al archivo JSON.
 * @returns {LowdbSync} Instancia de lowdb lista para usar.
 */
function getDB(relativePath) {
  const dbPath = path.join(__dirname, relativePath);
  const adapter = new FileSync(dbPath);
  const db = low(adapter);
  return db;
}

module.exports = {
  getDB
};
