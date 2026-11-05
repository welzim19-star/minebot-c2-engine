// module_builder.js
// V2: Parametrização Dinâmica (Entity Extraction) e Suporte a formato .schem

const { Schematic } = require('prismarine-schematic');
const path = require('path');

function carregarModuloBuilder(bot) {
    console.log('[MÓDULO] Engenharia Civil (Schematic Builder V2) ativado.');

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // EXTRAÇÃO DE ENTIDADE (Entity Extraction)
        // Ex: Se o usuário digitar "iniciar obra casa_base1"
        if (msg.startsWith('iniciar obra ')) {
            // Extrai apenas o nome do projeto, removendo o comando inicial
            let nomeProjeto = msg.replace('iniciar obra ', '').trim();
            
            // Garante que a extensão correta (.schem) seja aplicada
            if (!nomeProjeto.endsWith('.schem')) {
                nomeProjeto += '.schem';
            }

            await executarObra(bot, nomeProjeto);
        }
    });
}

async function executarObra(bot, nomeArquivo) {
    const arquivoPath = path.join(__dirname, 'schematics', nomeArquivo);
    
    try {
        bot.chat(`[ENGENHARIA CIVIL] Lendo planta arquitetônica: ${nomeArquivo}...`);
        
        // Lê o arquivo Sponge Schematic (.schem)
        const schematic = await Schematic.read(arquivoPath);
        
        const localDaObra = bot.entity.position.floored();
        
        bot.chat('Iniciando impressão 3D. Por favor, forneça os blocos necessários se eu parar.');

        // O plugin 'builder' vai assumir os movimentos e cliques
        await bot.builder.build(schematic, localDaObra);
        
        bot.chat('Obra finalizada. Estrutura validada.');
    } catch (err) {
        bot.chat(`[ERRO CRÍTICO] Falha ao ler a planta. O arquivo ${nomeArquivo} existe na pasta schematics?`);
        console.error('\n[DEBUG BUILDER]:', err.message, '\n');
    }
}

module.exports = { carregarModuloBuilder };