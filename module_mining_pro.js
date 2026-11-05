// module_mining_pro.js
// V2.1: Tracing System e Proteção Anti-Freeze de Baixo Nível

const { goals } = require('mineflayer-pathfinder');
const vec3 = require('vec3');
const { equiparMelhorFerramenta } = require('./module_inventory');

function carregarModuloMiningPro(bot) {
    console.log('[MÓDULO] Operações Subterrâneas e Mineração Profunda (Anti-Freeze) ativado.');

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (msg.includes('iniciar escavacao')) {
            const nivelAlvo = 11; 
            bot.chat(`[OPERAÇÃO DE RISCO] Iniciando protocolo de escavação rumo ao nível Y:${nivelAlvo}.`);
            await iniciarStripMining(bot, nivelAlvo);
        }
    });
}

// Sub-rotina blindada com Try/Catch para impedir congelamento
async function cavarSeguro(bot, bloco) {
    if (bloco && !['air', 'cave_air', 'water', 'lava', 'bedrock'].includes(bloco.name)) {
        console.log(`[DEBUG] Quebrando bloco: ${bloco.name} nas coordenadas X:${bloco.position.x} Y:${bloco.position.y}`);
        try {
            await bot.lookAt(bloco.position.offset(0.5, 0.5, 0.5)); 
            await bot.dig(bloco);
        } catch (err) {
            console.log(`[DEBUG] Ignorando bloco inquebrável ou desync: ${err.message}`);
        }
    }
}

async function iniciarStripMining(bot, yAlvo) {
    bot.tarefaAbortada = false; 
    
    const armado = await equiparMelhorFerramenta(bot, 'pickaxe');
    if (!armado) return bot.chat("Operação Negada: Necessito de uma picareta.");

    let posicaoAtual = bot.entity.position.floored();
    bot.chat("Fase 1: Inserção. Escavando escadaria segura...");
    
    while (posicaoAtual.y > yAlvo) {
        if (bot.tarefaAbortada) return bot.chat("Escavação abortada pelo comando de segurança.");

        const blocoFrenteCima = bot.blockAt(posicaoAtual.offset(1, 1, 0));
        const blocoFrenteMeio = bot.blockAt(posicaoAtual.offset(1, 0, 0));
        const blocoFrenteBaixo = bot.blockAt(posicaoAtual.offset(1, -1, 0)); 

        try {
            await cavarSeguro(bot, blocoFrenteCima);
            await cavarSeguro(bot, blocoFrenteMeio);
            await cavarSeguro(bot, blocoFrenteBaixo);

            await bot.pathfinder.goto(new goals.GoalGetToBlock(posicaoAtual.x + 1, posicaoAtual.y - 1, posicaoAtual.z));
            posicaoAtual = bot.entity.position.floored(); 
            await bot.waitForTicks(5);

        } catch (err) {
            bot.chat("Obstrução geológica intransponível. Abortando descida.");
            break;
        }
    }

    if (bot.tarefaAbortada || posicaoAtual.y > yAlvo) return;

    bot.chat(`Fase 2: Camada Y:${bot.entity.position.floored().y} alcançada. Iniciando túnel principal.`);
    
    let blocosCavados = 0;
    while (blocosCavados < 50) { 
        if (bot.tarefaAbortada) break;

        posicaoAtual = bot.entity.position.floored();
        const blocoFrenteCima = bot.blockAt(posicaoAtual.offset(1, 1, 0));
        const blocoFrenteMeio = bot.blockAt(posicaoAtual.offset(1, 0, 0));

        try {
            await cavarSeguro(bot, blocoFrenteCima);
            await cavarSeguro(bot, blocoFrenteMeio);

            await bot.pathfinder.goto(new goals.GoalGetToBlock(posicaoAtual.x + 1, posicaoAtual.y, posicaoAtual.z));
            blocosCavados++;

            if (blocosCavados % 10 === 0) {
                const temTocha = bot.inventory.items().find(i => i.name === 'torch');
                if (temTocha) {
                    await bot.equip(temTocha, 'hand');
                    await bot.waitForTicks(5);
                    const chaoParaTocha = bot.blockAt(bot.entity.position.floored().offset(0, -1, 0));
                    await bot.lookAt(chaoParaTocha.position.offset(0.5, 1, 0.5));
                    await bot.placeBlock(chaoParaTocha, vec3(0, 1, 0));
                    await equiparMelhorFerramenta(bot, 'pickaxe'); 
                }
            }
        } catch (e) {
            bot.chat("Túnel obstruído.");
            break;
        }
    }
    bot.chat("Protocolo concluído.");
}

module.exports = { carregarModuloMiningPro };