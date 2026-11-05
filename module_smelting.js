// module_smelting.js
// Responsabilidade: Operação de Fornalhas e Fundição Térmica.

const { goals } = require('mineflayer-pathfinder');

function carregarModuloSmelting(bot) {
    console.log('[MÓDULO] Sistema de Fundição Térmica (Smelting) ativado.');

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (msg.match(/(assar|fundir|esquentar|derreter|queimar)/)) {
            bot.chat("Iniciando protocolo de fundição/cozimento...");
            await executarFornalha(bot);
        }
    });
}

async function executarFornalha(bot) {
    const mcData = require('minecraft-data')(bot.version);
    const fornalhaBloco = bot.findBlock({ matching: mcData.blocksByName.furnace.id, maxDistance: 15 });

    if (!fornalhaBloco) return bot.chat("Logística: Preciso de uma fornalha posicionada no ambiente para isso.");

    // Busca combustível
    const combustivel = bot.inventory.items().find(i => ['coal', 'charcoal', 'oak_log', 'oak_planks'].includes(i.name));
    if (!combustivel) return bot.chat("Falta de recursos: Não tenho combustível (carvão ou madeira).");

    // Busca minérios ou carnes cruas
    const minerio = bot.inventory.items().find(i => 
        ['iron_ore', 'gold_ore', 'beef', 'chicken', 'porkchop', 'mutton', 'potato', 'cobblestone'].includes(i.name)
    );

    if (!minerio) return bot.chat("Não tenho minérios ou comida crua no inventário para fundir.");

    try {
        await bot.pathfinder.goto(new goals.GoalGetToBlock(fornalhaBloco.position.x, fornalhaBloco.position.y, fornalhaBloco.position.z));
        const furnace = await bot.openFurnace(fornalhaBloco);
        
        bot.chat(`Adicionando combustível e inserindo ${minerio.name} na fornalha...`);

        // Insere 1 unidade de combustível e 1 unidade do item
        await furnace.putFuel(combustivel.type, null, 1);
        await furnace.putInput(minerio.type, null, 1);

        bot.chat("Aguardando o processamento térmico (aproximadamente 10 segundos)...");

        // Fica observando o fogo da fornalha
        furnace.on('update', async () => {
            // Se o progresso terminar e houver um item na saída
            if (furnace.outputItem) {
                bot.chat("Processo concluído. Extraindo resultado...");
                await furnace.takeOutput();
                await furnace.close();
                bot.chat("Item assado/fundido armazenado com sucesso no inventário.");
                // Remove o evento para não causar memory leak
                furnace.removeAllListeners('update'); 
            }
        });

    } catch (err) {
        bot.chat("Falha operacional ao tentar usar a fornalha.");
        console.error(err);
    }
}

module.exports = { carregarModuloSmelting };