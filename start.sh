#!/bin/bash
echo -e "\e[32m=======================================\e[0m"
echo -e "\e[32m     MINEBOT SSJ3 ENGINE - STARTUP     \e[0m"
echo -e "\e[32m=======================================\e[0m"
echo "[BOOT] Verificando dependencias..."

if [ ! -d "node_modules" ]; then
    echo "[BOOT] Modulos nao encontrados. Instalando pacotes..."
    npm install
fi

echo "[BOOT] Injetando C2 Gateway..."
node index.js
