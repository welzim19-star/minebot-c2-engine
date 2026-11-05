/**
 * PROJETO: MINEBOT SSJ3 - NÚCLEO C2 (COMMAND & CONTROL)
 * OBJETIVO: Execução de rotinas de farm/combate com interface LAN
 */

const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const readline = require('readline');
const { encontrarServidorLan } = require('./lan_scanner');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
// const autoEat = require('mineflayer-auto-eat').plugin || require('mineflayer-auto-eat').loader || require('mineflayer-auto-eat');
const toolPlugin = require('mineflayer-tool').plugin;
const { carregarModuloAcoes } = require('./module_actions');
const { carregarModuloCombate } = require('./module_combat');
const { carregarModuloMiningPro } = require('./module_mining_pro');
const { carregarModuloCrafting } = require('./module_crafting');
const { carregarModuloMovimento } = require('./module_movement');
const { carregarModuloBuilder } = require('./module_builder');
const { carregarModuloHome } = require('./module_home');
const { carregarModuloSmelting } = require('./module_smelting');
const { carregarModuloVisao } = require('./module_vision');
const { carregarModuloFarming } = require('./module_farming');
const { carregarModuloAutoProgression } = require('./module_auto_progression');

// --- CONFIGURAÇÃO DO SERVIDOR WEB ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir a interface do celular (que criaremos abaixo)
app.use(express.static(path.join(__dirname, 'public')));

// --- INSTANCIAÇÃO DO BOT (MODO SSJ3) ---
let bot;

async function iniciarBot() {
    try {
        console.log('\n[SISTEMA] Aguardando o Minecraft abrir o mundo na LAN...');
        console.log('[SISTEMA] Se o bot não detectar sozinho (por causa do Firewall), DIGITE A PORTA ABAIXO e aperte ENTER:');

        let portaLan = null;

        // Cria a interface de leitura do terminal
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Tenta achar a porta automaticamente ou pela digitação do usuário
        portaLan = await new Promise((resolve) => {
            // Fica escutando a digitação
            rl.question('', (resposta) => {
                const p = parseInt(resposta.trim());
                if (!isNaN(p)) {
                    console.log(`[MANUAL] Porta inserida manualmente: ${p}`);
                    resolve(p);
                }
            });

            // E tenta achar pela LAN ao mesmo tempo
            encontrarServidorLan(120000).then((porta) => {
                resolve(porta);
            }).catch(() => {});
        });

        rl.close();

        const botOptions = {
            host: '127.0.0.1', 
            port: portaLan,
            username: 'Minebot_SSJ3',
            version: false // "false" faz o bot descobrir a versão sozinho!
        };

        console.log(`[SISTEMA] Servidor detectado na porta ${portaLan}. Conectando o bot...`);
        bot = mineflayer.createBot(botOptions);

        // --- CARREGAMENTO DE PLUGINS E MÓDULOS ---
        bot.loadPlugin(pathfinder);
        // bot.loadPlugin(autoEat);
        bot.loadPlugin(toolPlugin);

        carregarModuloAcoes(bot);
        carregarModuloCombate(bot);
        carregarModuloMiningPro(bot);
        carregarModuloCrafting(bot);
        carregarModuloMovimento(bot);
        carregarModuloBuilder(bot);
        carregarModuloHome(bot);
        carregarModuloSmelting(bot);
        carregarModuloVisao(bot);
        carregarModuloFarming(bot);
        carregarModuloAutoProgression(bot);

        // --- EVENTOS DO BOT ---
        bot.on('kicked', (razao) => console.log('[KICKED]', razao));
        bot.on('error', (err) => console.log('[ERRO BOT]', err));
        bot.on('spawn', () => {
            console.log('[SUCESSO] Bot logado no jogo!');
            // Configurar movimentos do pathfinder
            const mcData = require('minecraft-data')(bot.version);
            const defaultMove = new Movements(bot, mcData);
            defaultMove.canDig = true; // Permite que o bot quebre blocos para se mover
            bot.pathfinder.setMovements(defaultMove);
        });

        // Configurar auto-eat (TEMPORARIAMENTE DESATIVADO devido a falha da biblioteca)
        // se precisar no futuro, implementaremos manualmente
        // bot.autoEat.options = { priority: 'foodPoints', startAt: 14, bannedFood: [] };
        // bot.on('health', () => { if (bot.autoEat && bot.food < 15) bot.autoEat.eat(); });

        // LOG DE TUDO NO TERMINAL E CONTATO VISUAL
        bot.on('chat', async (username, message) => {
            if(username !== bot.username) {
                console.log(`[JOGO - ${username}]: ${message}`);
                // Olha para o jogador que falou
                const player = bot.players[username];
                if (player && player.entity && !bot.pathfinder.isMoving()) {
                    try {
                        await bot.lookAt(player.entity.position.offset(0, player.entity.height, 0));
                    } catch (e) {}
                }
            }
        });

        const oldChat = bot.chat;
        bot.chat = (msg) => {
            console.log(`[BOT FALOU]: ${msg}`);
            oldChat.call(bot, msg);
        };
        let mudando = false;
        bot.on('end', (razao) => {
            if(mudando) return;
            mudando = true;
            console.log(`[SISTEMA] Bot desconectado: ${razao}. Reiniciando busca LAN em 5s...`);
            setTimeout(iniciarBot, 5000);
        });

    } catch (err) {
        console.log(`[SISTEMA] Erro Crítico: ${err.message}. Buscando novamente...`);
        setTimeout(iniciarBot, 3000);
    }
}

iniciarBot();

// --- LÓGICA DE COMUNICAÇÃO LAN ---
io.on('connection', (socket) => {
    console.log('[SSJ3] Controle Mobile Conectado.');

    // Enviar dados em tempo real para o celular
    const updateInterval = setInterval(() => {
        if (bot && bot.entity) {
            socket.emit('status_update', {
                health: Math.round(bot.health),
                food: Math.round(bot.food),
                pos: {
                    x: Math.round(bot.entity.position.x),
                    y: Math.round(bot.entity.position.y),
                    z: Math.round(bot.entity.position.z)
                }
            });
        }
    }, 1000);

    // Receber comandos do celular
    socket.on('execute_action', (data) => {
        console.log(`[!] Comando recebido via LAN: ${data.action}`);
        
        switch(data.action) {
            case 'start_farm':
                if(bot) bot.chat('Iniciando protocolo de mineração...');
                // Insira aqui sua função de farm existente
                break;
            case 'combat_mode':
                if(bot) bot.chat('Modo de combate SSJ3 ativado!');
                // Insira aqui sua função de combate
                break;
            case 'stop':
                if(bot) {
                    bot.chat('Encerrando atividades.');
                    if(bot.pathfinder) bot.pathfinder.setGoal(null);
                }
                break;
        }
    });

    socket.on('disconnect', () => clearInterval(updateInterval));
});

// LEVANTAR O SISTEMA NA PORTA 3000
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=========================================`);
    console.log(`SISTEMA ONLINE - PORTA ${PORT}`);
    console.log(`ACESSE NO CELULAR: http://SEU_IP_LOCAL:${PORT}`);
    console.log(`=========================================\n`);
});