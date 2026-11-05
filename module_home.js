// module_home.js
// Responsabilidade: Persistência de coordenadas e lógica de armazenamento em baús.

const fs = require('fs');
const { goals } = require('mineflayer-pathfinder');

function carregarModuloHome(bot) {
    const dbPath = './homes.json';

    console.log('[MÓDULO] Sistema de Home e Persistência ativado.');

    // Carrega a casa do arquivo se existir, senão inicia vazio
    let homes = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {};

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // --- DEFINIR HOME ---
        if (msg.includes('definir casa') || msg.includes('setar home')) {
            homes[username] = bot.entity.position;
            fs.writeFileSync(dbPath, JSON.stringify(homes, null, 2));
            bot.chat(`Base de operações registrada para ${username} em: ${Math.round(homes[username].x)}, ${Math.round(homes[username].z)}`);
        }

        // --- IR PARA CASA ---
        if (msg.includes('ir para casa') || msg.includes('voltar para base')) {
            if (!homes[username]) return bot.chat('Não tenho registro de base para você.');
            
            bot.chat('Iniciando viagem de retorno à base...');
            const h = homes[username];
            await bot.pathfinder.goto(new goals.GoalNear(h.x, h.y, h.z, 1));
            bot.chat('Chegamos em casa.');
        }

        // --- GUARDAR ITENS NO BAÚ (LOGÍSTICA) ---
        if (msg.includes('guardar itens') || msg.includes('limpar mochila')) {
            await rotinaDepositarNoBau(bot);
        }
    });
}

// Sub-rotina: Localizar baú e transferir itens não-ferramentas
async function rotinaDepositarNoBau(bot) {
    const mcData = require('minecraft-data')(bot.version);
    const bauBloco = bot.findBlock({
        matching: mcData.blocksByName.chest.id,
        maxDistance: 10
    });

    if (!bauBloco) return bot.chat('Erro: Nenhum baú detectado num raio de 10 metros da base.');

    try {
        await bot.pathfinder.goto(new goals.GoalGetToBlock(bauBloco.position.x, bauBloco.position.y, bauBloco.position.z));
        const bau = await bot.openChest(bauBloco);
        bot.chat('Baú aberto. Transferindo recursos...');

        // Filtra o que NÃO é ferramenta para não o bot não ficar desarmado
        const itensParaGuardar = bot.inventory.items().filter(i => 
            !i.name.includes('pickaxe') && 
            !i.name.includes('sword') && 
            !i.name.includes('axe') &&
            !i.name.includes('shovel')
        );

        for (const item of itensParaGuardar) {
            await bau.deposit(item.type, null, item.count);
        }

        await bau.close();
        bot.chat('Mochila esvaziada. Recursos em segurança.');
    } catch (err) {
        bot.chat('Falha ao interagir com o baú.');
        console.error(err);
    }
}

module.exports = { carregarModuloHome };