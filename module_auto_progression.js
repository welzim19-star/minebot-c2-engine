// module_auto_progression.js
// V1: Máquina de Estados de Progressão Automática (Do zero ao Diamante com Armadura)

const { executarExtracaoLote, rotinaPosicionamentoInteligente } = require('./module_actions');
const { executarCrafting } = require('./module_crafting');
const { equiparMelhorFerramenta, equiparArmaduras } = require('./module_inventory');

function carregarModuloAutoProgression(bot) {
    console.log('[MÓDULO] Progressão Automática ativado. (Comando: "progredir do zero")');

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (msg === 'progredir do zero') {
            bot.chat('Iniciando jornada épica: do zero ao diamante com armadura!');
            await iniciarJornada(bot);
        }
    });
}

// Helper para verificar se temos X de um item
function contarItem(bot, nome) {
    const itens = bot.inventory.items().filter(i => i.name === nome);
    return itens.reduce((acc, i) => acc + i.count, 0);
}

// Smelting otimizado para a progressão
async function fundirEmMassa(bot, fuelName, inputName, amount) {
    const mcData = require('minecraft-data')(bot.version);
    const fornalhaBloco = bot.findBlock({ matching: mcData.blocksByName.furnace.id, maxDistance: 10 });
    if (!fornalhaBloco) {
        bot.chat("Erro: Fornalha não encontrada para fundição.");
        return;
    }
    
    try {
        bot.chat(`Iniciando fundição de ${amount}x ${inputName}...`);
        const furnace = await bot.openFurnace(fornalhaBloco);
        const fuelId = mcData.itemsByName[fuelName].id;
        const inputId = mcData.itemsByName[inputName]?.id || mcData.blocksByName[inputName]?.id;
        
        if (!inputId) throw new Error("ID de input inválido.");

        await furnace.putFuel(fuelId, null, amount); // Requer 1 carvao a cada 8 itens, mas vamos simplificar usando madeira/tabua proporcional
        await furnace.putInput(inputId, null, amount);
        
        bot.chat(`Aguardando fundição... (Aprox. ${amount * 10} segundos)`);
        // Aguarda o tempo exato (10 segundos por item fundido = 200 ticks)
        await bot.waitForTicks(amount * 200 + 40); 
        
        await furnace.takeOutput();
        await furnace.close();
        bot.chat("Fundição concluída.");
    } catch (err) {
        bot.chat("Falha na fundição: " + err.message);
        console.error(err);
    }
}

async function iniciarJornada(bot) {
    bot.tarefaAbortada = false;
    
    // Etapa 1: Madeira
    bot.chat('Etapa 1/10: Coletando Madeira...');
    if (contarItem(bot, 'oak_log') < 3 && contarItem(bot, 'oak_planks') < 8) {
        await executarExtracaoLote(bot, ['oak_log', 'birch_log', 'spruce_log'], 4);
    }

    // Etapa 2: Bancada de Trabalho e Gravetos
    bot.chat('Etapa 2/10: Fabricando infraestrutura base...');
    const temBancada = bot.inventory.items().find(i => i.name === 'crafting_table');
    const blocoBancadaNoMundo = bot.findBlock({ matching: require('minecraft-data')(bot.version).blocksByName.crafting_table.id, maxDistance: 6 });
    
    // Transforma TODA a madeira coletada em tábuas (planks) independente do tipo
    let madeiraColetada = bot.inventory.items().find(i => i.name.includes('_log'));
    if (madeiraColetada) {
        const nomePlank = madeiraColetada.name.replace('_log', '_planks');
        // Se tiver menos de 8 tábuas, converte mais madeira
        if (contarItem(bot, nomePlank) < 8) {
            // bot.chat(`[DEBUG] Transformando ${madeiraColetada.count}x ${madeiraColetada.name} em ${nomePlank}...`);
            await executarCrafting(bot, nomePlank, madeiraColetada.count);
            await bot.waitForTicks(20); // Delay para sincronizar inventário e evitar spam
        }
    }

    if (!temBancada && !blocoBancadaNoMundo) {
        // bot.chat('[DEBUG] Nenhuma bancada encontrada. Fabricando uma...');
        await executarCrafting(bot, 'crafting_table', 1);
        await bot.waitForTicks(10);
        await rotinaPosicionamentoInteligente(bot, 'crafting_table');
        await bot.waitForTicks(20);
    } else if (temBancada && !blocoBancadaNoMundo) {
        await rotinaPosicionamentoInteligente(bot, 'crafting_table');
    }
    
    if (contarItem(bot, 'stick') < 4) {
        // bot.chat('[DEBUG] Fabricando gravetos...');
        // Precisamos garantir que temos tábuas para os gravetos (caso algo tenha dado errado)
        madeiraColetada = bot.inventory.items().find(i => i.name.includes('_log'));
        if (madeiraColetada && contarItem(bot, 'oak_planks') === 0 && contarItem(bot, 'birch_planks') === 0) {
            await executarCrafting(bot, madeiraColetada.name.replace('_log', '_planks'), 1);
            await bot.waitForTicks(10);
        }
        await executarCrafting(bot, 'stick', 1); 
        await bot.waitForTicks(20);
    }

    // Etapa 3: Picareta de Madeira
    bot.chat('Etapa 3/10: Criando picareta de madeira...');
    let temPicaretaMad = bot.inventory.items().find(i => i.name === 'wooden_pickaxe');
    
    // Aproximar-se da bancada antes de craftar
    const bancadaParaUso = bot.findBlock({ matching: require('minecraft-data')(bot.version).blocksByName.crafting_table.id, maxDistance: 8 });
    if (bancadaParaUso) {
        const { goals } = require('mineflayer-pathfinder');
        await bot.pathfinder.goto(new goals.GoalNear(bancadaParaUso.position.x, bancadaParaUso.position.y, bancadaParaUso.position.z, 1));
        await bot.waitForTicks(10);
    }

    if (!temPicaretaMad) {
        await executarCrafting(bot, 'wooden_pickaxe', 1);
        // Atualiza a variavel após tentar fabricar
        temPicaretaMad = bot.inventory.items().find(i => i.name === 'wooden_pickaxe');
    }
    
    if (!temPicaretaMad) {
        return bot.chat('Jornada Abortada: Falha crítica ao fabricar a picareta de madeira. Falta de recursos.');
    }
    
    await equiparMelhorFerramenta(bot, 'pickaxe');

    // Etapa 4: Coletar Pedra
    bot.chat('Etapa 4/10: Minerando Pedra para evolução da era...');
    if (contarItem(bot, 'cobblestone') < 15) {
        await executarExtracaoLote(bot, ['stone', 'cobblestone'], 15);
    }

    // Etapa 5: Equipamento de Pedra e Fornalha
    bot.chat('Etapa 5/10: Fabricando picareta de pedra e fornalha...');
    if (!bot.inventory.items().find(i => i.name === 'stone_pickaxe')) {
        await executarCrafting(bot, 'stone_pickaxe', 1);
    }
    if (!bot.inventory.items().find(i => i.name === 'furnace') && !bot.findBlock({ matching: require('minecraft-data')(bot.version).blocksByName.furnace.id, maxDistance: 15 })) {
        await executarCrafting(bot, 'furnace', 1);
        await rotinaPosicionamentoInteligente(bot, 'furnace');
    } else if (bot.inventory.items().find(i => i.name === 'furnace') && !bot.findBlock({ matching: require('minecraft-data')(bot.version).blocksByName.furnace.id, maxDistance: 15 })) {
        await rotinaPosicionamentoInteligente(bot, 'furnace');
    }

    await equiparMelhorFerramenta(bot, 'pickaxe');

    // Etapa 6: Coletar Ferro e Carvão (ou mais madeira para queimar)
    bot.chat('Etapa 6/10: Minerando Ferro (Necessário 27 para armadura e picareta)...');
    // Pegar madeira extra para usar como combustível se não achar carvão rápido
    if (contarItem(bot, 'oak_planks') < 30) {
        await executarExtracaoLote(bot, ['oak_log', 'birch_log'], 8);
        await executarCrafting(bot, 'oak_planks', 4);
    }

    if (contarItem(bot, 'iron_ore') + contarItem(bot, 'raw_iron') + contarItem(bot, 'iron_ingot') < 27) {
        await executarExtracaoLote(bot, ['iron_ore', 'deepslate_iron_ore', 'raw_iron'], 27);
    }

    // Etapa 7: Fundir o Ferro
    bot.chat('Etapa 7/10: Derretendo o ferro na fornalha...');
    const qtdRawIron = contarItem(bot, 'raw_iron') || contarItem(bot, 'iron_ore');
    if (qtdRawIron > 0) {
        const inputToSmelt = contarItem(bot, 'raw_iron') > 0 ? 'raw_iron' : 'iron_ore';
        await fundirEmMassa(bot, 'oak_planks', inputToSmelt, Math.min(qtdRawIron, 27));
    }

    // Etapa 8: Craftar Set de Ferro
    bot.chat('Etapa 8/10: Forjando Armadura e Ferramentas de Ferro...');
    const craftIronItem = async (itemName) => {
        if (!bot.inventory.items().find(i => i.name === itemName)) {
            await executarCrafting(bot, itemName, 1);
        }
    };
    await craftIronItem('iron_pickaxe');
    await craftIronItem('iron_chestplate');
    await craftIronItem('iron_leggings');
    await craftIronItem('iron_helmet');
    await craftIronItem('iron_boots');

    // Etapa 9: Equipar tudo
    bot.chat('Etapa 9/10: Equipando Armadura Pesada...');
    await equiparArmaduras(bot);
    await equiparMelhorFerramenta(bot, 'pickaxe');

    // Etapa 10: Descer para os diamantes (reaproveita comando do module_mining_pro.js)
    bot.chat('Etapa 10/10: Preparativos concluídos. Acionando Módulo Mining Pro rumo aos Diamantes!');
    // O module_mining_pro reage a "iniciar escavacao" no chat, então o bot pode simular ou chamar direto.
    // Vamos chamar emit 'chat' para simular o comando, assim reaproveitamos.
    bot.emit('chat', bot.username, 'iniciar escavacao');
}

module.exports = { carregarModuloAutoProgression };
