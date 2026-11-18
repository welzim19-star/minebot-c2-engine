// module_crafting.js
// V3: Parser NLP O(1) (Longest-Match First) e Cache Global

let mcDataCache = null;

function carregarModuloCrafting(bot) {
    console.log('[MÓDULO] Sistema de Manufatura V3 (NLP Otimizado) ativado.');

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (msg.match(/(criar|fazer|craftar|montar)/)) {
            const receitasDicionario = {
                'bancada': 'crafting_table', 'mesa de trabalho': 'crafting_table',
                'graveto': 'stick', 'tabua': 'oak_planks', 'madeira': 'oak_planks',
                'picareta de madeira': 'wooden_pickaxe', 'picareta de pedra': 'stone_pickaxe',
                'picareta de ferro': 'iron_pickaxe', 'picareta de diamante': 'diamond_pickaxe',
                'espada de madeira': 'wooden_sword', 'espada de pedra': 'stone_sword', 
                'espada de ferro': 'iron_sword', 'espada de diamante': 'diamond_sword',
                'machado de madeira': 'wooden_axe', 'machado de pedra': 'stone_axe',
                'machado de ferro': 'iron_axe', 'machado de diamante': 'diamond_axe',
                'pa de madeira': 'wooden_shovel', 'pa de pedra': 'stone_shovel',
                'pa de ferro': 'iron_shovel', 'pa de diamante': 'diamond_shovel',
                'enxada de madeira': 'wooden_hoe', 'enxada de pedra': 'stone_hoe',
                'enxada de ferro': 'iron_hoe', 'enxada de diamante': 'diamond_hoe',
                'fornalha': 'furnace', 'tocha': 'torch', 'bau': 'chest',
                'porta': 'oak_door', 'barco': 'oak_boat', 'cama': 'red_bed',
                'pao': 'bread', 'balde': 'bucket', 'tesoura': 'shears', 'escudo': 'shield'
            };

            // LONGEST-MATCH FIRST: Ordena por tamanho da string e para no primeiro (maior) hit
            const chavesOrdenadas = Object.keys(receitasDicionario).sort((a, b) => b.length - a.length);
            const match = chavesOrdenadas.find(k => msg.includes(k));

            if (!match) return bot.chat('Receita não encontrada no banco de dados.');
            
            const itemAlvo = receitasDicionario[match];
            const quantidade = msg.match(/\d+/) ? parseInt(msg.match(/\d+/)[0]) : 1;
            await executarCrafting(bot, itemAlvo, quantidade);
        }
    });
}

async function executarCrafting(bot, nomeItem, quantidade) {
    if (!mcDataCache) mcDataCache = require('minecraft-data')(bot.version);
    const item = mcDataCache.itemsByName[nomeItem] || mcDataCache.blocksByName[nomeItem];
    
    if (!item) return bot.chat(`[ERRO INTERNO] ID '${nomeItem}' inválido.`);
    bot.chat(`Calculando dependências para: ${nomeItem}...`);

    try {
        const receitaSemMesa = bot.recipesFor(item.id, null, 1, null)[0];
        let bancadaDeTrabalho = null;

        if (!receitaSemMesa || receitaSemMesa.requiresTable) {
            const blocoMesa = bot.findBlock({ matching: mcDataCache.blocksByName.crafting_table.id, maxDistance: 10 });
            if (!blocoMesa) return bot.chat('Preciso de uma Bancada de Trabalho próxima.');
            bancadaDeTrabalho = blocoMesa;
        }

        const receitaFinal = bot.recipesFor(item.id, null, 1, bancadaDeTrabalho)[0];
        
        if (!receitaFinal) {
            return bot.chat('Operação abortada: Não possuo os materiais (ingredientes) suficientes.');
        }

        await bot.craft(receitaFinal, quantidade, bancadaDeTrabalho);
        bot.chat(`Sucesso! ${quantidade}x ${nomeItem} fabricado(s).`);
    } catch (err) {
        bot.chat('Proteção ativada: Falha assíncrona na engine de crafting.');
        console.error('[CRAFTING CRASH AVOIDED]:', err.message);
    }
}

module.exports = { carregarModuloCrafting, executarCrafting };
