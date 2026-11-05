// module_movement.js
const { Movements, goals } = require('mineflayer-pathfinder');
const pathfinder = require('mineflayer-pathfinder').pathfinder;

function carregarModuloMovimento(bot) {
    // A inicialização do pathfinder (motor de movimento) já é feita no index.js
    // Aqui nós apenas lidamos com os comandos de seguir e parar.


    // Variável de Estado para rastrear quem o bot está seguindo dinamicamente
    let alvoPerseguicao = null;

    bot.on('stop_all', () => {
        alvoPerseguicao = null;
        if (bot.pathfinder) bot.pathfinder.setGoal(null);
        bot.chat('Movimentação interrompida.');
    });

    console.log('[MÓDULO] Sistema Motor (FSM e NLP Básico) ativado.');

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;

        // Normalização de string: Transforma tudo em minúsculas e remove acentos
        // Isso permite que ele entenda "Siga-me", "siga", "SIGA" da mesma forma.
        const msgNormalizada = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // ---------------------------------------------------------
        // INTENÇÃO 1: IR PARA COORDENADA E PARAR (GoalNear)
        // ---------------------------------------------------------
        if (msgNormalizada.includes('vem aqui') || msgNormalizada.includes('venha') || msgNormalizada.includes('cola aqui')) {
            const player = bot.players[username];
            if (!player || !player.entity) return bot.chat('Radar cego. Não vejo sua entidade.');
            
            // Limpa qualquer estado de perseguição anterior
            alvoPerseguicao = null; 
            
            bot.chat('Calculando rota estática. Indo para sua posição atual e mantendo posição.');
            const p = player.entity.position;
            bot.pathfinder.setGoal(new goals.GoalNear(p.x, p.y, p.z, 1));
        }

        // ---------------------------------------------------------
        // INTENÇÃO 2: SEGUIR DINAMICAMENTE (GoalFollow)
        // ---------------------------------------------------------
        else if (msgNormalizada.includes('siga') || msgNormalizada.includes('atras de mim') || msgNormalizada.includes('vem comigo')) {
            const player = bot.players[username];
            if (!player || !player.entity) return bot.chat('Radar cego. Não vejo sua entidade.');
            
            bot.chat('Modo perseguição ativado. Na sua cola.');
            alvoPerseguicao = player.entity;
            
            // O parâmetro '2' é a distância em blocos que ele vai manter de você.
            // O 'true' diz para o pathfinder atualizar a rota constantemente.
            bot.pathfinder.setGoal(new goals.GoalFollow(alvoPerseguicao, 2), true);
        }

        // ---------------------------------------------------------
        // INTENÇÃO 3: PARADA DE EMERGÊNCIA (Idle) - REDIRECIONADO
        // ---------------------------------------------------------
        else if (msgNormalizada.includes('parar') || msgNormalizada.includes('fique ai') || msgNormalizada.includes('stop')) {
            // Isso agora é tratado globalmente no module_actions que emite 'stop_all'
            // Mas mantemos aqui como backup ou sinônimos menores se necessário.
            bot.emit('stop_all');
        }
    });
}

module.exports = { carregarModuloMovimento };