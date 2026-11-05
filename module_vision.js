// module_vision.js
// Responsabilidade: Varredura de ambiente e identificação de matrizes de blocos.

function carregarModuloVisao(bot) {
    // Carrega o banco de dados de blocos específico da versão 1.14.4
    const mcData = require('minecraft-data')(bot.version);

    console.log('[MÓDULO] Sistema Sensorial (Radar 3D) ativado.');

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;

        // Gatilho do comando: ex. "radar oak_log" ou "radar diamond_ore"
        if (message.startsWith('radar ')) {
            // Extrai o nome do bloco digitado após a palavra "radar"
            const blocoAlvo = message.split(' ')[1]; 
            
            // Tratamento de Exceção: Verifica se o bloco existe na API do jogo
            if (!mcData.blocksByName[blocoAlvo]) {
                bot.chat(`[ERRO DE SINTAXE] O bloco '${blocoAlvo}' não consta no banco de dados.`);
                return;
            }

            // O bot trabalha com IDs numéricos internamente, não com nomes em texto
            const blocoId = mcData.blocksByName[blocoAlvo].id;
            bot.chat(`Iniciando varredura por: ${blocoAlvo}...`);

            // Executa o algoritmo de busca
            const alvoEncontrado = bot.findBlock({
                matching: blocoId,
                maxDistance: 32 // Raio de visão do bot (32 blocos em todas as direções)
            });

            if (alvoEncontrado) {
                // Desestruturação de objetos para extrair os eixos X, Y, Z
                const { x, y, z } = alvoEncontrado.position;
                
                // Calcula a distância matemática exata entre o bot e o bloco
                const distancia = bot.entity.position.distanceTo(alvoEncontrado.position).toFixed(1);
                
                bot.chat(`Alvo detectado! Coordenadas -> X: ${x}, Y: ${y}, Z: ${z} | Distância: ${distancia} metros.`);
            } else {
                bot.chat('Radar limpo. Alvo não encontrado no raio de 32 metros.');
            }
        }
    });
}

module.exports = { carregarModuloVisao };