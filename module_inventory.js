// module_inventory.js
// V5: Logística Total com Ranking de Tier O(1) e Zero-Regressão

const TIER_WEIGHTS = {
    netherite: 6,
    diamond: 5,
    iron: 4,
    stone: 3,
    golden: 2,
    wooden: 1
};

function getToolScore(itemName) {
    const prefix = itemName.split('_')[0];
    return TIER_WEIGHTS[prefix] || 0;
}

function carregarModuloInventario(bot) {
    console.log('[MÓDULO] Logística V5 (Ranking de Tier e Inventário) ativado.');

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

// Equipa a MELHOR ferramenta disponível por tier (Netherite -> Diamond -> Iron -> Stone -> Wood)
async function equiparMelhorFerramenta(bot, tipo) {
    const ferramentas = bot.inventory.items()
        .filter(i => i.name.includes(tipo))
        .sort((a, b) => getToolScore(b.name) - getToolScore(a.name));

    if (ferramentas.length === 0) return false;
    try {
        await bot.equip(ferramentas[0], 'hand');
        return true;
    } catch (err) {
        return false;
    }
}

// Equipa um bloco ou item exato (ex: "crafting_table")
async function equiparItemExato(bot, nomeExato) {
    const item = bot.inventory.items().find(i => i.name === nomeExato);
    if (!item) return false;
    try {
        await bot.equip(item, 'hand');
        return true;
    } catch (err) {
        return false;
    }
}

async function equiparArmaduras(bot) {
    const tipos = ['head', 'torso', 'legs', 'feet'];
    const nomesArmor = ['helmet', 'chestplate', 'leggings', 'boots'];

    for (let i = 0; i < tipos.length; i++) {
        const armorCandidates = bot.inventory.items()
            .filter(item => item.name.includes(nomesArmor[i]))
            .sort((a, b) => getToolScore(b.name) - getToolScore(a.name));

        if (armorCandidates.length > 0) {
            try {
                await bot.equip(armorCandidates[0], tipos[i]);
            } catch (e) {
                console.log(`[ERRO ARMADURA] Falha ao equipar ${armorCandidates[0].name}: ${e.message}`);
            }
        }
    }
}

module.exports = {
    carregarModuloInventario,
    equiparMelhorFerramenta,
    calcularOcupacao,
    equiparItemExato,
    equiparArmaduras
};
