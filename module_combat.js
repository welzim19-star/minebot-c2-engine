// module_combat.js
// V2.0: Sincronia de Inventário O(1) e Retaliação Tática
const pvp = require('mineflayer-pvp').plugin;
const { equiparMelhorFerramenta } = require('./module_inventory');

function carregarModuloCombate(bot) {
    bot.loadPlugin(pvp);
    console.log('[MÓDULO] Sistema de Combate Tático ativado.');
    
    let protegerAlvo = null;
    let modoCombateLivre = false;

    bot.on('stop_all', () => {
        bot.pvp.stop();
        protegerAlvo = null;
        modoCombateLivre = false;
        bot.chat('Modo de combate desativado.');
    });

    async function engajarAlvo(alvo) {
        if (!alvo) return;
        // Prioridade: Espada. Se falhar, Machado. Se falhar, mão nua.
        let armado = await equiparMelhorFerramenta(bot, 'sword');
        if (!armado) armado = await equiparMelhorFerramenta(bot, 'axe');
        
        if (!armado) bot.chat('ALERTA: Entrando em combate corpo-a-corpo sem armas adequadas!');
        bot.pvp.attack(alvo);
    }

    // GATILHO DE DEFESA AUTOMÁTICA
    bot.on('entityHurt', async (entity) => {
        if (entity !== bot.entity) return;

        const atacante = bot.nearestEntity(e => 
            e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 4
        );

        if (atacante) {
            bot.chat('Ameaça detectada! Ativando retaliação!');
            bot.emit('stop_all');
            await engajarAlvo(atacante);
        }

        if (protegerAlvo && entity.username === protegerAlvo) {
            const agressor = bot.nearestEntity(e => e.position.distanceTo(entity.position) < 5 && e.type !== 'player' && e.type !== 'object');
            if (agressor) {
                bot.chat(`Defendendo ${protegerAlvo}!`);
                await engajarAlvo(agressor);
            }
        }
    });

    // COMANDOS MANUAIS
    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (msg.includes('atacar') || msg.includes('mate')) {
            const alvo = bot.nearestEntity(e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16);
            if (alvo) {
                bot.chat(`Engajando combate contra: ${alvo.name}`);
                bot.emit('stop_all');
                modoCombateLivre = true;
                await engajarAlvo(alvo);
            } else {
                bot.chat('Radar limpo. Nenhuma ameaça hostil nas proximidades.');
            }
        }

        if (msg.includes('proteger me') || msg.includes('seja meu guarda') || msg.includes('guarde')) {
            protegerAlvo = username;
            bot.chat(`Protocolo Guarda-costas ativado para: ${username}.`);
        }

        if (msg.includes('recuar') || msg.includes('parar ataque')) {
            bot.emit('stop_all');
        }
    });
}

module.exports = { carregarModuloCombate };
