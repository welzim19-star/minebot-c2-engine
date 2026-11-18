// module_mining_pro.js
// V4.0: Tracing System, Anti-Freeze Omnidirecional (Yaw) e Export Direto

const { goals } = require('mineflayer-pathfinder');
const vec3 = require('vec3');
const { equiparMelhorFerramenta } = require('./module_inventory');

function carregarModuloMiningPro(bot) {
    console.log('[MÓDULO] Operações Subterrâneas V4 (Raycast 360º) ativado.');

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (msg.includes('iniciar escavacao')) {
            const nivelAlvo = 11; 
            bot.chat(`[OPERAÇÃO DE RISCO] Protocolo direcional rumo ao Y:${nivelAlvo}.`);
            await iniciarStripMining(bot, nivelAlvo);
        }
    });
}

// Retorna o vetor direcional (X, Z) normalizado para onde o bot está olhando
function getVetorDirecao(bot) {
    const yaw = bot.entity.yaw;
    // No Mineflayer: 0 = Sul (+Z), PI/2 = Oeste (-X), PI = Norte (-Z), -PI/2 = Leste (+X)
    let dx = 0;
    let dz = 0;

    const absYaw = Math.abs(yaw);
    if (absYaw < Math.PI / 4) { dz = 1; } // Olhando pro Sul
    else if (absYaw > (3 * Math.PI) / 4) { dz = -1; } // Olhando pro Norte
    else if (yaw > 0) { dx = -1; } // Olhando pro Oeste
    else { dx = 1; } // Olhando pro Leste

    return { dx, dz };
}

async function cavarSeguro(bot, bloco) {
    if (bloco && !['air', 'cave_air', 'water', 'lava', 'bedrock'].includes(bloco.name)) {
        try {
            await bot.lookAt(bloco.position.offset(0.5, 0.5, 0.5)); 
            await bot.dig(bloco);
        } catch (err) {
            console.log(`[DEBUG] Ignorando bloco inquebrável/desync: ${err.message}`);
        }
    }
}

async function iniciarStripMining(bot, yAlvo) {
    bot.tarefaAbortada = false; 
    
    const armado = await equiparMelhorFerramenta(bot, 'pickaxe');
    if (!armado) return bot.chat("Operação Negada: Necessito de uma picareta.");

    let posicaoAtual = bot.entity.position.floored();
    const dir = getVetorDirecao(bot); // Captura a direção inicial
    
    bot.chat(`Fase 1: Escavando escadaria segura na direção (X:${dir.dx}, Z:${dir.dz})...`);
    
    while (posicaoAtual.y > yAlvo) {
        if (bot.tarefaAbortada) return bot.chat("Escavação abortada.");

        // VISÃO TRIPLA OMNIDIRECIONAL
        const blocoFrenteCima = bot.blockAt(posicaoAtual.offset(dir.dx, 1, dir.dz));
        const blocoFrenteMeio = bot.blockAt(posicaoAtual.offset(dir.dx, 0, dir.dz));
        const blocoFrenteBaixo = bot.blockAt(posicaoAtual.offset(dir.dx, -1, dir.dz)); 

        try {
            await cavarSeguro(bot, blocoFrenteCima);
            await cavarSeguro(bot, blocoFrenteMeio);
            await cavarSeguro(bot, blocoFrenteBaixo);

            await bot.pathfinder.goto(new goals.GoalGetToBlock(posicaoAtual.x + dir.dx, posicaoAtual.y - 1, posicaoAtual.z + dir.dz));
            posicaoAtual = bot.entity.position.floored(); 
            await bot.waitForTicks(5);
        } catch (err) {
            bot.chat("Obstrução geológica intransponível. Abortando descida.");
            break;
        }
    }

    if (bot.tarefaAbortada || posicaoAtual.y > yAlvo) return;
    bot.chat(`Fase 2: Camada Y:${bot.entity.position.floored().y} alcançada. Iniciando túnel.`);
    
    let blocosCavados = 0;
    while (blocosCavados < 50) { 
        if (bot.tarefaAbortada) break;

        posicaoAtual = bot.entity.position.floored();
        const blocoFrenteCima = bot.blockAt(posicaoAtual.offset(dir.dx, 1, dir.dz));
        const blocoFrenteMeio = bot.blockAt(posicaoAtual.offset(dir.dx, 0, dir.dz));

        try {
            await cavarSeguro(bot, blocoFrenteCima);
            await cavarSeguro(bot, blocoFrenteMeio);

            await bot.pathfinder.goto(new goals.GoalGetToBlock(posicaoAtual.x + dir.dx, posicaoAtual.y, posicaoAtual.z + dir.dz));
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
    bot.chat("Protocolo de mineração profunda concluído.");
}

module.exports = { carregarModuloMiningPro, iniciarStripMining };
