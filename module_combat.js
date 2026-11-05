// module_combat.js
const pvp = require('mineflayer-pvp').plugin;

function carregarModuloCombate(bot) {
    // Carrega o plugin de PVP no bot
    bot.loadPlugin(pvp);

    console.log('[MÓDULO] Sistema de Combate e Retaliação ativado.');
    let protegerAlvo = null;

    bot.on('stop_all', () => {
        bot.pvp.stop();
        protegerAlvo = null;
        bot.chat('Modo de combate desativado.');
    });

    // GATILHO DE DEFESA AUTOMÁTICA (Retaliação e Guarda)
    // Dispara sempre que alguma entidade recebe dano no jogo
    bot.on('entityHurt', (entity) => {
        // Se quem apanhou não foi o nosso bot, ignora.
        if (entity !== bot.entity) return;

        // Retaliar apenas se tiver certeza de quem é o agressor ou contra monstros próximos
        // Para evitar bater no jogador por causa de dano de queda, ignoramos 'player'.
        const atacante = bot.nearestEntity(e => 
            e.type === 'mob' && 
            e.position.distanceTo(bot.entity.position) < 4
        );

        if (atacante) {
            bot.chat('Ameaça hostil detectada! Abortando tarefas e ativando protocolo de retaliação!');
            bot.emit('stop_all'); // Para todas as outras tarefas
            bot.pvp.attack(atacante);
        }

        // Se o guarda-costas estiver ativo e o alvo do bot apanhar
        if (protegerAlvo && entity.username === protegerAlvo) {
            const agressor = bot.nearestEntity(e => e.position.distanceTo(entity.position) < 5 && e.type !== 'player' && e.type !== 'object');
            if (agressor) {
                bot.chat(`Protegendo ${protegerAlvo}! Atacando ameaça.`);
                bot.pvp.attack(agressor);
            }
        }
    });

    // COMANDOS MANUAIS
    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (msg.includes('atacar') || msg.includes('mate')) {
            // Procura o monstro hostil mais próximo num raio de 16 blocos
            const alvo = bot.nearestEntity(e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16);
            
            if (alvo) {
                bot.chat(`Engajando combate contra: ${alvo.name}`);
                bot.emit('stop_all');
                bot.pvp.attack(alvo);
            } else {
                bot.chat('Radar limpo. Nenhuma ameaça hostil nas proximidades.');
            }
        }

        if (msg.includes('proteger me') || msg.includes('seja meu guarda') || msg.includes('guarde')) {
            protegerAlvo = username;
            bot.chat(`Protocolo Guarda-costas ativado! Seguirei e protegerei o jogador: ${username}.`);
        }

        // Comando para cessar fogo
        if (msg.includes('recuar') || msg.includes('parar ataque')) {
            bot.pvp.stop();
            bot.chat('Cessar fogo. Retornando ao estado de alerta.');
        }
    });
}

module.exports = { carregarModuloCombate };