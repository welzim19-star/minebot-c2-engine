// bot_core.js
const mineflayer = require('mineflayer');

function iniciarBot(porta) {
    return new Promise((resolve) => {
        console.log(`[INFRA] Injetando o bot na porta TCP ${porta}...`);
        
        const bot = mineflayer.createBot({
            host: 'localhost',
            port: porta,
            username: 'Minebot_Zero',
            version: '1.14.4'
        });

        bot.on('spawn', () => {
            console.log('[SISTEMA] Conexão L7 estabelecida. Bot renderizado no mundo.');
            resolve(bot); // Devolve o bot pronto para o index.js
        });

        bot.on('error', err => console.error('[ERRO DE REDE]', err));
        bot.on('kicked', reason => console.warn('[DESCONECTADO]', reason));
    });
}

module.exports = { iniciarBot };