// module_smelting.js
// V2.0: Prevenção de Memory Leak e Cache de Instância

const { goals } = require('mineflayer-pathfinder');
let mcDataCache = null; // $O(1)$ Cache global para o módulo

function carregarModuloSmelting(bot) {
    console.log('[MÓDULO] Sistema de Fundição Térmica (Anti-Leak) ativado.');

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
    if (!mcDataCache) mcDataCache = require('minecraft-data')(bot.version); // Carrega apenas 1x
    const fornalhaBloco = bot.findBlock({ matching: mcDataCache.blocksByName.furnace.id, maxDistance: 15 });

    if (!fornalhaBloco) return bot.chat("Logística: Preciso de uma fornalha posicionada no ambiente para isso.");

    const combustivel = bot.inventory.items().find(i => ['coal', 'charcoal', 'oak_log', 'oak_planks'].includes(i.name));
    if (!combustivel) return bot.chat("Falta de recursos: Não tenho combustível.");

    const minerio = bot.inventory.items().find(i => 
        ['iron_ore', 'gold_ore', 'beef', 'chicken', 'porkchop', 'mutton', 'potato', 'cobblestone', 'raw_iron'].includes(i.name)
    );

    if (!minerio) return bot.chat("Não tenho minérios ou comida crua no inventário para fundir.");

    try {
        await bot.pathfinder.goto(new goals.GoalGetToBlock(fornalhaBloco.position.x, fornalhaBloco.position.y, fornalhaBloco.position.z));
        const furnace = await bot.openFurnace(fornalhaBloco);
        
        bot.chat(`Inserindo ${minerio.name} na fornalha...`);
        await furnace.putFuel(combustivel.type, null, 1);
        await furnace.putInput(minerio.type, null, 1);

        bot.chat("Aguardando o processamento térmico (aprox. 10s)...");

        // Blindagem contra Memory Leak: Promisificamos o evento e garantimos remoção
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                furnace.removeAllListeners('update');
                reject(new Error("Timeout na fornalha"));
            }, 15000);

            const onUpdate = async () => {
                if (furnace.outputItem) {
                    clearTimeout(timeout);
                    furnace.removeListener('update', onUpdate);
                    try {
                        bot.chat("Processo concluído. Extraindo resultado...");
                        await furnace.takeOutput();
                        resolve();
                    } catch(e) {
                        reject(e);
                    }
                }
            };
            furnace.on('update', onUpdate);
        });

        await furnace.close();
        bot.chat("Item armazenado com sucesso no inventário.");
    } catch (err) {
        bot.chat(`Falha operacional: ${err.message}`);
        console.error("[SMELTING ERRO]:", err);
    }
}

module.exports = { carregarModuloSmelting };
