// module_farming.js
// V2.0: Colheita Segura e Replantio Blindado (Zero-Crash)

const { goals } = require('mineflayer-pathfinder');
const { equiparItemExato } = require('./module_inventory'); // Importa a Logistica V5

let mcDataCache = null;

function carregarModuloFarming(bot) {
    console.log('[MÓDULO] Agricultura e Colheita Automatizada V2 ativado.');

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (msg.includes('colher plantacao') || msg.includes('trigo') || msg.includes('fazenda')) {
            await iniciarColheita(bot);
        }
    });
}

async function iniciarColheita(bot) {
    bot.tarefaAbortada = false;
    bot.chat('Iniciando inspeção e colheita da safra...');

    if (!mcDataCache) mcDataCache = require('minecraft-data')(bot.version);

    while (!bot.tarefaAbortada) {
        // Encontra safras maduras (metadado 7 é o estado máximo para trigo/cenoura/batata)
        const alvo = bot.findBlock({
            matching: (block) => {
                if (!block) return false;
                if (block.name === 'wheat' && block.metadata === 7) return true;
                if (block.name === 'carrots' && block.metadata === 7) return true;
                if (block.name === 'potatoes' && block.metadata === 7) return true;
                if (block.name === 'beetroots' && block.metadata === 3) return true;
                return false;
            },
            maxDistance: 15
        });

        if (!alvo) {
            bot.chat('Nenhuma safra pronta para colheita no radar.');
            break;
        }

        try {
            await bot.pathfinder.goto(new goals.GoalGetToBlock(alvo.position.x, alvo.position.y, alvo.position.z));
            if (bot.tarefaAbortada) break;

            const nomePlanta = alvo.name;
            await bot.dig(alvo);
            await bot.waitForTicks(5); // Aguarda o item dropar no chao e ser coletado

            // Mapeia sementes
            let semente = null;
            if (nomePlanta === 'wheat') semente = 'wheat_seeds';
            else if (nomePlanta === 'carrots') semente = 'carrot';
            else if (nomePlanta === 'potatoes') semente = 'potato';
            else if (nomePlanta === 'beetroots') semente = 'beetroot_seeds';

            if (semente) {
                // Utiliza a função blindada O(1) do Módulo de Inventário V5
                const segurouItem = await equiparItemExato(bot, semente);
                
                if (segurouItem) {
                    const blocoTerra = bot.blockAt(alvo.position.offset(0, -1, 0));
                    await bot.placeBlock(blocoTerra, require('vec3')(0, 1, 0));
                } else {
                    console.log(`[ALERTA FARMING] Semente de ${semente} insuficiente no inventário para replantio.`);
                }
            }

        } catch (err) {
            console.log(`[ERRO COLHEITA] Obstrução ou desync ao interagir com a planta: ${err.message}`);
        }
    }
}

module.exports = { carregarModuloFarming, iniciarColheita };
