const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { manejarMensaje } = require('./handlers/ManejadorMensajes');

console.log('🚀 Iniciando Asistente ISIUX...');
console.log('📱 Conectando con WhatsApp...\n');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('🔐 Código QR generado:');
    console.log('📲 Escanea este código con tu WhatsApp para autenticar el bot\n');
    qrcode.generate(qr, { small: true });
    console.log('\n⏳ Esperando autenticación...\n');
});

client.on('ready', () => {
    console.log('✅ ¡Bot conectado exitosamente!');
    console.log('🤖 Asistente ISIUX está listo para recibir mensajes\n');
});

client.on('authenticated', () => {
    console.log('🔓 Autenticación exitosa');
});

client.on('auth_failure', (msg) => {
    console.log('❌ Error de autenticación:', msg);
});

client.on('disconnected', (reason) => {
    console.log('🔌 Bot desconectado:', reason);
});

client.on('message', async msg => {
    const numero = msg.from;
    const mensaje = msg.body;

    console.log(`📨 Mensaje recibido de ${numero}: "${mensaje}"`);

    // 1. Si es pregunta, reacciona con 🤔
    if (
        mensaje.trim().endsWith('?') ||
        /^(qué|cual|cuál|cuáles|como|cómo|dónde|por qué|quién|quienes|para qué|cuando|cuándo)/i.test(mensaje.trim())
    ) {
        try {
            await msg.react('🤔');
        } catch (e) {
            console.log('No se pudo reaccionar al mensaje:', e.message);
        }
    }

    // 2. Mostrar estado escribiendo mientras procesa
    try {
        await msg.getChat().then(chat => chat.sendStateTyping());
    } catch (e) {
        console.log('No se pudo enviar estado escribiendo:', e.message);
    }

    // Procesa el mensaje con tu handler (async)
    const respuesta = await manejarMensaje(client, numero, mensaje);

    // 3. Responde al usuario
    if (respuesta) {
        await msg.reply(respuesta);
        console.log(`💬 Respuesta enviada: "${respuesta}"\n`);
    }

    // 4. Quitar estado escribiendo
    try {
        await msg.getChat().then(chat => chat.clearState());
    } catch (e) {
        // No es crítico si falla
    }
});

client.initialize(); 