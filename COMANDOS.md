# 📖 Tabela de Comandos do Bot (Documentação PT-BR V10.3)

| Categoria | Comandos Naturais em Português (Exemplos) | O que o bot faz internamente |
| --- | --- | --- |
| Kill Switch | parar, abortar, stop | Zera rotas físicas, loops matemáticos e para o combate PVP. |
| Gestão de Mão | equipar picareta, segurar espada, por na mao tocha, segurar terra | O motor NLP traduz a string e coloca o item ou ferramenta na mão principal. |
| Locomoção | vem aqui, siga me | Calcula pathfinding e segue as coordenadas dinâmicas do dono. |
| Extração | minerar [QTD] madeira, quebrar 5 pedra, pegar 10 carvao, coletar ferro | Equipa a ferramenta correta, acha os blocos e quebra até atingir o lote. |
| Operação Subterrânea | iniciar escavacao | Cava um túnel tipo escada até Y:11 com try/catch e iluminação inteligente (V2.1 - Anti-Freeze). |
| Engajamento PVP | atacar vaca, matar zumbi | Equipa espada, calcula Line of Sight e aplica dano melee. |
| Defesa Base | construir abrigo | Pega terra/pedra e ergue uma parede em formato de "L" ao redor dele mesmo. |
| Logística Base | definir casa, ir para casa, guardar itens | Salva um JSON com as coords X/Z. Retorna e despeja recursos não essenciais no baú. |
| Inventário | status, inventario, dropar tudo | Retorna telemetria (HP/Fome), lista itens ou ejeta tudo no chão. |
| Fornalha e Craft | fazer bancada, fazer picareta de pedra, assar carne, fundir ferro | Lê a API de receitas. Usa blocos próximos se precisar. Fornalha detecta combustível automaticamente. |
| Posicionamento | posicionar bancada, colocar fornalha, por tocha, posicionar bau | Algoritmo de 243 blocos varre o ambiente e fixa o objeto perto de paredes com anti-desync. |
| Sobrevivência | comer fome, dormir cama, explorar caverna | Restaura saturação, reseta o tempo do servidor e entra em modo furtivo iluminando a área. |
