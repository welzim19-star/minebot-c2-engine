// lan_scanner.js
const dgram = require('dgram');

function encontrarServidorLan(timeout_ms = 5000) {
    return new Promise((resolve, reject) => {
        const socket = dgram.createSocket('udp4');
        let portaEncontrada = null;

        console.log('[SISTEMA] Iniciando varredura UDP por servidores LAN...');

        // O Minecraft faz broadcast na porta 4445
        socket.bind(4445, () => {
            // Permite que o socket receba pacotes de broadcast
            socket.setBroadcast(true); 
        });

        // Quando um pacote (mensagem) chegar
        socket.on('message', (msg, rinfo) => {
            const mensagem = msg.toString();
            // A mensagem do Minecraft costuma ter este formato:
            // [MOTD]A Minecraft Server[/MOTD][AD]51234[/AD]
            
            // Regex para extrair apenas os números entre a tag [AD] e [/AD]
            const match = mensagem.match(/\[AD\](\d+)\[\/AD\]/);
            
            if (match && match[1]) {
                portaEncontrada = parseInt(match[1]);
                console.log(`[SUCESSO] Servidor detectado no IP: ${rinfo.address} | Porta: ${portaEncontrada}`);
                socket.close();
                resolve(portaEncontrada);
            }
        });

        socket.on('error', (err) => {
            socket.close();
            reject(err);
        });

        // Se passar X segundos e não achar nada, cancela a busca
        setTimeout(() => {
            if (!portaEncontrada) {
                socket.close();
                reject(new Error('Nenhum servidor LAN do Minecraft detectado no tempo limite.'));
            }
        }, timeout_ms);
    });
}

// Exporta a função para usarmos no nosso bot
module.exports = { encontrarServidorLan };