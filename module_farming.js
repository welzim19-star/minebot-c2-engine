// module_farming.js
// Responsabilidade: Colher plantações prontas e replantar automaticamente.

const { goals } = require('mineflayer-pathfinder');

function carregarModuloFarming(bot) {
    console.log('[MÓDULO] Agricultura e Colheita Automatizada ativado.');

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (msg.includes('colher plantacao') || msg.includes('trigo') || msg.includes('fazenda')) {
            await iniciarColheita(bot);
        }
    });

    bot.on('stop_all', () => {
        // Interrompe qualquer loop de colheita ativo
        bot.tarefaAbortada = true;
    });
}

async function iniciarColheita(bot) {
    bot.tarefaAbortada = false;
    bot.chat('Iniciando inspeção e colheita da safra...');

    const mcData = require('minecraft-data')(bot.version);

    while (!bot.tarefaAbortada) {
        // Encontra todas as plantações prontas para colher num raio de 15 blocos
        // Em muitas versões, metadata 7 = totalmente crescido (trigo, cenoura, batata)
        // No 1.14+, wheat com metadata/level 7
        const alvo = bot.findBlock({
            matching: (block) => {
                if (block && block.name === 'wheat' && block.metadata === 7) return true;
                if (block && block.name === 'carrots' && block.metadata === 7) return true;
                if (block && block.name === 'potatoes' && block.metadata === 7) return true;
                if (block && block.name === 'beetroots' && block.metadata === 3) return true;
                return false;
            },
            maxDistance: 15
        });

        if (!alvo) {
            bot.chat('Nenhuma safra pronta para colheita na área atual.');
            break;
        }

        try {
            await bot.pathfinder.goto(new goals.GoalGetToBlock(alvo.position.x, alvo.position.y, alvo.position.z));
            if (bot.tarefaAbortada) break;

            const nomePlanta = alvo.name;
            await bot.dig(alvo);
            
            // Tenta replantar a mesma semente após colher
            await bot.waitForTicks(5);
            let semente = null;
            if (nomePlanta === 'wheat') semente = 'wheat_seeds';
            else if (nomePlanta === 'carrots') semente = 'carrot';
            else if (nomePlanta === 'potatoes') semente = 'potato';
            else if (nomePlanta === 'beetroots') semente = 'beetroot_seeds';

            if (semente) {
                // mineflayer-tool ajuda a equipar o item certo
                try {
                    await bot.equip(mcData.itemsByName[semente].id, 'hand');
                    const blocoTerra = bot.blockAt(alvo.position.offset(0, -1, 0));
                    await bot.placeBlock(blocoTerra, require('vec3')(0, 1, 0));
                } catch (err) {
                    console.log(`[ERRO PLANTIO] Falha ao replantar ${semente}: ${err.message}`);
                }
            }

        } catch (err) {
            console.log(`[ERRO COLHEITA] Não consegui acessar ou quebrar a planta: ${err.message}`);
        }
    }
}

module.exports = { carregarModuloFarming };
