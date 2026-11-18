// lan_scanner.js
// V2.0: Resiliência Anti-EADDRINUSE (ReuseAddr)
const dgram = require('dgram');

function encontrarServidorLan(timeout_ms = 5000) {
    return new Promise((resolve, reject) => {
        // reuseAddr: true impede o EADDRINUSE se o socket anterior não morreu rápido o suficiente
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        let portaEncontrada = null;
        let timeoutId;

        console.log('[SISTEMA] Iniciando varredura UDP por servidores LAN...');

        socket.bind(4445, () => {
            socket.setBroadcast(true); 
        });

        socket.on('message', (msg, rinfo) => {
            const mensagem = msg.toString();
            const match = mensagem.match(/\[AD\](\d+)\[\/AD\]/);
            
            if (match && match[1]) {
                portaEncontrada = parseInt(match[1]);
                console.log(`[SUCESSO] Servidor detectado no IP: ${rinfo.address} | Porta: ${portaEncontrada}`);
                clearTimeout(timeoutId);
                socket.close(() => resolve(portaEncontrada));
            }
        });

        socket.on('error', (err) => {
            clearTimeout(timeoutId);
            socket.close();
            reject(err);
        });

        timeoutId = setTimeout(() => {
            if (!portaEncontrada) {
                socket.close(() => reject(new Error('Nenhum servidor LAN detectado no tempo limite.')));
            }
        }, timeout_ms);
    });
}
module.exports = { encontrarServidorLan };
