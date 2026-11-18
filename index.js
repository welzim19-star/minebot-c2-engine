/**
- PROJETO: MINEBOT SSJ3 - NÚCLEO C2 (COMMAND & CONTROL)
- OBJETIVO: C2 Gateway Zero-Trust (PIN Auth) e Event Loop Principal
 */

const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const readline = require('readline');
const { encontrarServidorLan } = require('./lan_scanner');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const toolPlugin = require('mineflayer-tool').plugin;
const crypto = require('crypto');

// Import dos Módulos Essenciais (Com as funções reais para o HUD)
const { carregarModuloAcoes } = require('./module_actions');
const { carregarModuloCombate } = require('./module_combat');
const { carregarModuloMiningPro, iniciarStripMining } = require('./module_mining_pro');
const { carregarModuloCrafting } = require('./module_crafting');
const { carregarModuloMovimento } = require('./module_movement');
const { carregarModuloBuilder } = require('./module_builder');
const { carregarModuloHome } = require('./module_home');
const { carregarModuloSmelting } = require('./module_smelting');
const { carregarModuloVisao } = require('./module_vision');
const { carregarModuloFarming, iniciarColheita } = require('./module_farming');
const { carregarModuloAutoProgression } = require('./module_auto_progression');

// --- SEGURANÇA ZERO-TRUST (OTP PIN) ---
const AUTH_PIN = crypto.randomInt(1000, 9999).toString();
console.log(`\n=========================================`);
console.log(`[ZERO-TRUST] PIN DE ACESSO DO C2: \x1b[32m${AUTH_PIN}\x1b[0m`);
console.log(`=========================================\n`);

// --- CONFIGURAÇÃO DO SERVIDOR WEB ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Middleware de Autenticação O(1)
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token === AUTH_PIN) {
        return next();
    }
    console.log(`[SEGURANÇA] Droppando conexão não autorizada. (IP: ${socket.handshake.address})`);
    return next(new Error('Acesso Negado: PIN Inválido'));
});

// --- INSTANCIAÇÃO DO BOT (MODO SSJ3) ---
let bot;
let botEmOperacao = false;

async function iniciarBot() {
    if (botEmOperacao) return;
    botEmOperacao = true;

    try {
        console.log('\n[SISTEMA] Aguardando o Minecraft abrir o mundo na LAN...');
        console.log('[SISTEMA] Se o bot não detectar sozinho (por causa do Firewall), DIGITE A PORTA ABAIXO e aperte ENTER:');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const portaLan = await new Promise((resolve) => {
            let resolvido = false;
            const finalizar = (p) => {
                if (!resolvido) {
                    resolvido = true;
                    rl.close();
                    resolve(p);
                }
            };

            rl.question('', (resposta) => {
                const p = parseInt(resposta.trim());
                if (!isNaN(p)) {
                    console.log(`[MANUAL] Porta inserida: ${p}`);
                    finalizar(p);
                }
            });

            encontrarServidorLan(120000).then((porta) => finalizar(porta)).catch(() => {});
        });

        const botOptions = {
            host: '127.0.0.1', 
            port: portaLan,
            username: 'Minebot_SSJ3',
            version: false
        };

        console.log(`[SISTEMA] Servidor detectado na porta ${portaLan}. Conectando o bot...`);
        bot = mineflayer.createBot(botOptions);

        bot.loadPlugin(pathfinder);
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

        bot.on('kicked', (razao) => console.log('[KICKED]', razao));
        bot.on('error', (err) => console.log('[ERRO BOT]', err));
        
        bot.on('spawn', () => {
            console.log('[SUCESSO] Bot logado no jogo!');
            const mcData = require('minecraft-data')(bot.version);
            const defaultMove = new Movements(bot, mcData);
            defaultMove.canDig = true;
            bot.pathfinder.setMovements(defaultMove);
        });

        bot.on('chat', async (username, message) => {
            if(username !== bot.username) {
                console.log(`[JOGO - ${username}]: ${message}`);
                const player = bot.players[username];
                if (player && player.entity && !bot.pathfinder.isMoving()) {
                    try { await bot.lookAt(player.entity.position.offset(0, player.entity.height, 0)); } catch (e) {}
                }
            }
        });

        const oldChat = bot.chat;
        bot.chat = (msg) => {
            console.log(`[BOT FALOU]: ${msg}`);
            oldChat.call(bot, msg);
        };

        bot.on('end', (razao) => {
            botEmOperacao = false;
            console.log(`[SISTEMA] Bot desconectado: ${razao}. Reiniciando busca LAN em 5s...`);
            setTimeout(iniciarBot, 5000);
        });

    } catch (err) {
        botEmOperacao = false;
        console.log(`[SISTEMA] Erro Crítico: ${err.message}. Buscando novamente...`);
        setTimeout(iniciarBot, 3000);
    }
}

iniciarBot();

// --- LÓGICA DE COMUNICAÇÃO LAN (SOCKET.IO) ---
io.on('connection', (socket) => {
    console.log(`[SSJ3] Controle Mobile Conectado. (IP: ${socket.handshake.address})`);

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

    socket.on('execute_action', async (data) => {
        console.log(`[!] Comando C2 validado recebido: ${data.action}`);
        if (!bot) return;

        switch(data.action) {
            case 'start_farm':
                // Executamos a subrotina direta em vez de emitir chat falso
                iniciarColheita(bot).catch(e => console.error("[FARM ERRO]", e));
                break;
            case 'combat_mode':
                // Vamos simular a chamada de ataque do NLP (exige alvo próximo)
                bot.emit('chat', bot.username, 'atacar');
                break;
            case 'mining_pro':
                bot.chat('Acionando Módulo Mining Pro!');
                iniciarStripMining(bot, 11).catch(e => console.error("[MINING ERRO]", e));
                break;
            case 'stop':
                bot.chat('Encerrando atividades. Abortando tarefas!');
                bot.emit('stop_all'); // Módulo Combate e Farming capturam isso
                bot.tarefaAbortada = true; // Força parada dos Whiles
                if (bot.pathfinder) bot.pathfinder.setGoal(null);
                break;
        }
    });

    socket.on('disconnect', () => clearInterval(updateInterval));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=========================================`);
    console.log(`SISTEMA ONLINE - PORTA ${PORT}`);
    console.log(`ACESSE NO CELULAR: http://SEU_IP_LOCAL:${PORT}`);
    console.log(`O PIN Zero-Trust será exigido no acesso.`);
    console.log(`=========================================\n`);
});
