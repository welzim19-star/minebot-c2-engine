// module_actions.js
// V10.3: Córtex Master - Dicionário Léxico PT-BR e Regressão Zero.

const { goals } = require('mineflayer-pathfinder');
const { equiparMelhorFerramenta, calcularOcupacao, equiparItemExato } = require('./module_inventory');
const vec3 = require('vec3'); 

function carregarModuloAcoes(bot) {
    console.log('[MÓDULO] Córtex de Ações V10.3 (Motor NLP PT-BR ativado).');
    bot.tarefaAbortada = false;

    bot.on('death', () => {
        bot.tarefaAbortada = true;
        bot.pathfinder.setGoal(null); 
        if (bot.pvp) bot.pvp.stop();
    });

    bot.on('spawn', () => { bot.tarefaAbortada = false; });

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // --- 0. COMANDO GLOBAL DE PARADA ---
        if (msg.match(/(parar|abortar|pare|stop)/)) {
            bot.emit('stop_all');
            return;
        }

        // --- 1. EXTRAÇÃO ---
        if (msg.match(/(minerar|coletar|pegar|cortar|quebrar)/)) {
            const materiais = {
                'madeira': { tipo: 'wood', ids: ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'cherry_log', 'mangrove_log'], ferramenta: 'axe' },
                'terra': { tipo: 'dirt', ids: ['dirt', 'grass_block', 'podzol', 'mycelium'], ferramenta: 'shovel' },
                'pedra': { tipo: 'stone', ids: ['stone', 'cobblestone', 'deepslate', 'cobbled_deepslate', 'diorite', 'granite', 'andesite'], ferramenta: 'pickaxe' },
                'pedregulho': { tipo: 'stone', ids: ['cobblestone', 'cobbled_deepslate'], ferramenta: 'pickaxe' },
                'carvao': { tipo: 'ore', ids: ['coal_ore', 'deepslate_coal_ore'], ferramenta: 'pickaxe' },
                'ferro': { tipo: 'ore', ids: ['iron_ore', 'deepslate_iron_ore'], ferramenta: 'pickaxe' },
                'ouro': { tipo: 'ore', ids: ['gold_ore', 'deepslate_gold_ore'], ferramenta: 'pickaxe' },
                'diamante': { tipo: 'ore', ids: ['diamond_ore', 'deepslate_diamond_ore'], ferramenta: 'pickaxe' },
                'redstone': { tipo: 'ore', ids: ['redstone_ore', 'deepslate_redstone_ore'], ferramenta: 'pickaxe' },
                'lapis': { tipo: 'ore', ids: ['lapis_ore', 'deepslate_lapis_ore'], ferramenta: 'pickaxe' },
                'esmeralda': { tipo: 'ore', ids: ['emerald_ore', 'deepslate_emerald_ore'], ferramenta: 'pickaxe' },
                'quartzo': { tipo: 'ore', ids: ['nether_quartz_ore'], ferramenta: 'pickaxe' },
                'areia': { tipo: 'sand', ids: ['sand', 'red_sand'], ferramenta: 'shovel' },
                'cascalho': { tipo: 'gravel', ids: ['gravel'], ferramenta: 'shovel' },
                'argila': { tipo: 'clay', ids: ['clay'], ferramenta: 'shovel' },
                'obsidian': { tipo: 'obsidian', ids: ['obsidian'], ferramenta: 'pickaxe' }
            };

            let materialAlvo = null;
            Object.keys(materiais).forEach(k => { if (msg.includes(k)) materialAlvo = materiais[k]; });
            if (!materialAlvo) return; 

            const q = msg.match(/\d+/) ? parseInt(msg.match(/\d+/)[0]) : 1;
            bot.chat(`Extraindo ${q} bloco(s).`);
            await equiparMelhorFerramenta(bot, materialAlvo.ferramenta);
            await executarExtracaoLote(bot, materialAlvo.ids, q);
        }

        // --- 3. CONSTRUÇÃO TÁTICA ---
        else if (msg.includes('construir') && (msg.includes('casa') || msg.includes('abrigo'))) {
            await construirAbrigoSimples(bot);
        }

        // --- 4. ALIMENTAÇÃO ---
        else if (msg.includes('comer') || msg.includes('fome')) {
            await rotinaAlimentar(bot);
        }

        // --- 5. TELEMETRIA ---
        else if (msg.includes('status') || msg.includes('como voce esta')) {
            bot.chat(`HP: ${Math.round(bot.health)} | Fome: ${Math.round(bot.food)} | Inventário: ${Math.round(calcularOcupacao(bot))}% cheio.`);
        }

        // --- 6. DORMIR ---
        else if (msg.includes('dormir') || msg.includes('cama')) {
            await rotinaDormir(bot);
        }

        // --- 7. DESCARTE ---
        else if (msg.includes('dropar tudo') || msg.includes('esvaziar mochila aqui')) {
            bot.chat('Esvaziando inventário...');
            for (const item of bot.inventory.items()) { try { await bot.tossStack(item); await bot.waitForTicks(2); } catch (e) { console.log(`[ERRO INVENTÁRIO] Falha ao dropar ${item.name}: ${e.message}`); } }
        }

        // --- 8. POSICIONAMENTO INTELIGENTE ---
        else if (msg.match(/(posicionar|colocar|por) (.*)/)) {
            const dicionarioItens = {
                'bancada': 'crafting_table', 'mesa de trabalho': 'crafting_table',
                'fornalha': 'furnace', 'bau': 'chest', 'tocha': 'torch', 
                'cama': 'red_bed', 'cama vermelha': 'red_bed', 'cama branca': 'white_bed',
                'la': 'white_wool', 'pedra': 'cobblestone', 'terra': 'dirt',
                'porta': 'oak_door', 'barco': 'oak_boat', 'placa': 'oak_sign',
                'madeira': 'oak_planks', 'tabua': 'oak_planks'
            };

            let itemParaColocar = null;
            Object.keys(dicionarioItens).forEach(k => { if (msg.includes(k)) itemParaColocar = dicionarioItens[k]; });
            if (!itemParaColocar) return bot.chat('Objeto desconhecido no banco de dados espacial.');

            const temItem = bot.inventory.items().find(i => i.name === itemParaColocar);
            if (!temItem) return bot.chat(`Não tenho '${itemParaColocar}' no inventário.`);

            await rotinaPosicionamentoInteligente(bot, itemParaColocar);
        }

        // --- 9. PROTOCOLO DE CAVERNAS ---
        else if (msg === 'explorar caverna') {
            await protocoloExploracaoCaverna(bot);
        }

        // --- 10. GESTÃO DE MÃO (COM TRADUTOR NLP) ---
        else if (msg.match(/(segurar|equipar|por na mao) (.*)/)) {
            let alvo = msg.replace(/(segurar|equipar|por na mao) /, '').trim();
            bot.chat(`Acessando mochila para equipar: ${alvo}`);
            
            // Dicionário de Tradução PT-BR -> Minecraft Core
            const tradutor = {
                'picareta': 'pickaxe', 'espada': 'sword', 'machado': 'axe', 
                'pa': 'shovel', 'enxada': 'hoe', 'tocha': 'torch', 
                'bancada': 'crafting_table', 'fornalha': 'furnace', 'bau': 'chest', 
                'cama': 'red_bed', 'la': 'white_wool', 'pedra': 'cobblestone', 
                'pedregulho': 'cobblestone', 'terra': 'dirt', 'madeira': 'oak_log', 
                'tabua': 'oak_planks', 'carne': 'beef', 'frango': 'chicken', 
                'porco': 'porkchop', 'pao': 'bread', 'maca': 'apple',
                'picareta de madeira': 'wooden_pickaxe', 'picareta de pedra': 'stone_pickaxe',
                'picareta de ferro': 'iron_pickaxe', 'picareta de diamante': 'diamond_pickaxe',
                'espada de madeira': 'wooden_sword', 'espada de pedra': 'stone_sword',
                'espada de ferro': 'iron_sword', 'espada de diamante': 'diamond_sword',
                'balde': 'bucket', 'balde de agua': 'water_bucket', 'balde de lava': 'lava_bucket',
                'escudo': 'shield', 'arco': 'bow', 'flecha': 'arrow'
            };

            // Se a palavra existir no dicionário, usa a tradução. Se não, tenta usar a palavra original.
            let alvoTraduzido = tradutor[alvo] || alvo;

            if (['pickaxe', 'sword', 'axe', 'shovel', 'hoe'].some(t => alvoTraduzido.includes(t))) {
                const sucesso = await equiparMelhorFerramenta(bot, alvoTraduzido);
                if (sucesso) bot.chat('Equipamento tático em mãos.');
                else bot.chat(`Negativo. Não localizei nenhuma ${alvo} disponível.`);
            } else {
                const sucesso = await equiparItemExato(bot, alvoTraduzido);
                if (sucesso) bot.chat('Item posicionado na mão principal.');
                else bot.chat(`Negativo. O item '${alvo}' não foi encontrado.`);
            }
        }
    });
}

// ==========================================
// SUB-ROTINAS DE EXECUÇÃO
// ==========================================

async function rotinaPosicionamentoInteligente(bot, nomeObjeto) {
    const p = bot.entity.position.floored();
    let melhoresSpots = [];
    for (let x = -4; x <= 4; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -4; z <= 4; z++) {
                const targetPos = p.offset(x, y, z);
                const distancia = targetPos.distanceTo(bot.entity.position);
                if (distancia < 1.5 || distancia > 4) continue; 
                const blocoAlvo = bot.blockAt(targetPos);
                const blocoAbaixo = bot.blockAt(targetPos.offset(0, -1, 0));
                if (blocoAlvo && blocoAlvo.name === 'air' && blocoAbaixo && blocoAbaixo.boundingBox === 'block') {
                    let score = 0; 
                    const blocoAcima = bot.blockAt(targetPos.offset(0, 3, 0));
                    if (blocoAcima && blocoAcima.boundingBox === 'block') score += 10;
                    const adjacentes = [bot.blockAt(targetPos.offset(1, 0, 0)), bot.blockAt(targetPos.offset(-1, 0, 0)), bot.blockAt(targetPos.offset(0, 0, 1)), bot.blockAt(targetPos.offset(0, 0, -1))];
                    let encostadoEmParede = false;
                    for (let adj of adjacentes) { if (adj && adj.boundingBox === 'block') { score += 5; encostadoEmParede = true; } }
                    if (score >= 10 && !encostadoEmParede) score -= 5; 
                    melhoresSpots.push({ pos: targetPos, score: score, dist: distancia });
                }
            }
        }
    }
    if (melhoresSpots.length === 0) return bot.chat('Geometria local inviável.');
    melhoresSpots.sort((a, b) => { if (b.score !== a.score) return b.score - a.score; return a.dist - b.dist; });
    const spotIdeal = melhoresSpots[0];
    try {
        await bot.pathfinder.goto(new goals.GoalNear(spotIdeal.pos.x, spotIdeal.pos.y, spotIdeal.pos.z, 2));
        bot.pathfinder.setGoal(null);
        await bot.waitForTicks(10); 
        const equipado = await equiparItemExato(bot, nomeObjeto);
        if (!equipado) return bot.chat('Falha ao segurar item.');
        await bot.waitForTicks(5);
        const blocoReferencia = bot.blockAt(spotIdeal.pos.offset(0, -1, 0));
        await bot.lookAt(blocoReferencia.position.offset(0.5, 1, 0.5));
        await bot.waitForTicks(5);
        await bot.placeBlock(blocoReferencia, vec3(0, 1, 0));
        bot.chat('Objeto fixado no solo com sucesso.');
    } catch (err) { 
        console.log(`[ERRO CONSTRUÇÃO] Não consegui colocar o objeto: ${err.message}`);
        bot.chat(`Tive um problema ao posicionar: ${err.message}`);
    }
}

async function protocoloExploracaoCaverna(bot) {
    bot.chat("[ALERTA VERMELHO] Protocolo de Exploração. Nível de Perigo: ALTO.");
    const armado = await equiparMelhorFerramenta(bot, 'sword');
    if (!armado) bot.chat("AVISO: Entrando em zona hostil desarmado.");
    else bot.chat("Espada equipada. Escaneando ambiente.");
    const temTocha = bot.inventory.items().find(i => i.name === 'torch');
    const nivelLuz = bot.blockAt(bot.entity.position).light;
    if (nivelLuz < 5) {
        bot.chat("Breu detectado. Risco de Mobs.");
        if (temTocha) { await rotinaPosicionamentoInteligente(bot, 'torch'); } 
        else bot.chat("CRÍTICO: Sem tochas.");
    }
}

async function executarExtracaoLote(bot, listaNomesBlocos, quantidade) {
    bot.tarefaAbortada = false;
    const mcData = require('minecraft-data')(bot.version);
    const idsValidos = listaNomesBlocos.map(n => mcData.blocksByName[n]?.id).filter(id => id !== undefined);
    for (let i = 1; i <= quantidade; i++) {
        if (bot.tarefaAbortada) return;
        if (calcularOcupacao(bot) > 90) { bot.chat('Inventário crítico. Abortando.'); break; }
        const alvo = bot.findBlock({ matching: idsValidos, maxDistance: 32 });
        if (!alvo) { bot.chat(`Recurso esgotado ou fora de alcance visual. Coletados: ${i - 1}/${quantidade}.`); break; }
        try {
            await bot.pathfinder.goto(new goals.GoalGetToBlock(alvo.position.x, alvo.position.y, alvo.position.z));
            if (bot.tarefaAbortada) return; 
            await bot.dig(alvo);
            await bot.waitForTicks(10); 
        } catch (err) { 
            console.log(`[ERRO MINERAÇÃO] Falha ao alcançar/minerar bloco: ${err.message}`);
            continue; 
        }
    }
    if (!bot.tarefaAbortada) bot.chat('Extração finalizada.');
}

async function construirAbrigoSimples(bot) {
    const b = bot.inventory.items().find(i => i.name.includes('dirt') || i.name.includes('cobblestone') || i.name.includes('planks'));
    if (!b) return bot.chat('Sem blocos sólidos.');
    const p = bot.entity.position.floored();
    const offsets = [ [1, 0, 0], [1, 1, 0], [1, 0, 1], [1, 1, 1] ];
    for (const off of offsets) {
        if (bot.tarefaAbortada) return;
        try {
            const tPos = p.offset(off[0], off[1], off[2]);
            await bot.pathfinder.goto(new goals.GoalPlaceBlock(tPos, bot.world, {}));
            await bot.placeBlock(bot.blockAt(tPos.offset(0, -1, 0)), vec3(0, 1, 0));
        } catch (e) { 
            console.log(`[ERRO CONSTRUÇÃO] Falha ao erguer bloco de abrigo: ${e.message}`);
            continue; 
        }
    }
    bot.chat('Estrutura defensiva erguida com sucesso.');
}

async function rotinaAlimentar(bot) {
    const c = bot.inventory.items().find(i => ['apple', 'cooked_beef', 'bread', 'carrot', 'cooked_chicken'].includes(i.name));
    if (c) { await bot.equip(c, 'hand'); await bot.consume(); bot.chat('Alimentado.'); } 
    else bot.chat('ALERTA: Não possuo suprimentos alimentares.');
}

async function rotinaDormir(bot) {
    const c = bot.findBlock({ matching: b => bot.isABed(b), maxDistance: 10 });
    if (!c) return bot.chat('Nenhuma cama num raio de 10 blocos.');
    try {
        await bot.pathfinder.goto(new goals.GoalNear(c.position.x, c.position.y, c.position.z, 1));
        await bot.sleep(c);
        bot.chat('Dormindo...');
    } catch (err) { bot.chat('Não é possível dormir agora.'); }
}

module.exports = { carregarModuloAcoes, executarExtracaoLote, rotinaPosicionamentoInteligente };