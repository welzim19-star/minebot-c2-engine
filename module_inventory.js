// module_inventory.js
// V4: Logística Total (Garantia de Exportação do equiparItemExato)

function carregarModuloInventario(bot) {
    console.log('[MÓDULO] Logística V4 (Equipamentos e Blocos) ativado.');

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (msg.includes('inventario')) {
            const itens = bot.inventory.items().map(i => `${i.count}x ${i.name}`).join(', ');
            bot.chat(itens || 'Inventário Vazio.');
        }
    });
}

function calcularOcupacao(bot) {
    const slotsOcupados = bot.inventory.items().length;
    const totalSlots = 36;
    return (slotsOcupados / totalSlots) * 100;
}

// Equipa ferramentas baseadas em parte do nome (ex: "pickaxe")
async function equiparMelhorFerramenta(bot, tipo) {
    const ferramentas = bot.inventory.items().filter(i => i.name.includes(tipo));
    if (ferramentas.length === 0) return false;
    try {
        await bot.equip(ferramentas[0], 'hand');
        return true;
    } catch (err) { return false; }
}

// FUNÇÃO CRÍTICA DO FIX: Equipa um bloco ou item exato (ex: "crafting_table")
async function equiparItemExato(bot, nomeExato) {
    const item = bot.inventory.items().find(i => i.name === nomeExato);
    if (!item) return false;
    try {
        await bot.equip(item, 'hand');
        return true;
    } catch (err) { return false; }
}

async function equiparArmaduras(bot) {
    const tipos = ['head', 'torso', 'legs', 'feet'];
    const nomesArmor = ['helmet', 'chestplate', 'leggings', 'boots'];
    
    for (let i = 0; i < tipos.length; i++) {
        const armorItem = bot.inventory.items().find(item => item.name.includes(nomesArmor[i]));
        if (armorItem) {
            try {
                await bot.equip(armorItem, tipos[i]);
            } catch(e) {
                console.log(`[ERRO ARMADURA] Falha ao equipar ${armorItem.name}: ${e.message}`);
            }
        }
    }
}

// [!] A LINHA ABAIXO É O QUE CAUSOU O ERRO. 
// Ela precisa exportar todas as 4 funções para os outros módulos conseguirem ler.
module.exports = { carregarModuloInventario, equiparMelhorFerramenta, calcularOcupacao, equiparItemExato, equiparArmaduras };