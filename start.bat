@echo off
title Minebot SSJ3 C2 - Bootloader
color 0A
echo =======================================
echo     MINEBOT SSJ3 ENGINE - STARTUP
echo =======================================
echo [BOOT] Verificando dependencias locais...

if not exist "node_modules\" (
    echo [BOOT] Modulos nao encontrados. Instalando via NPM...
    npm install
)

echo [BOOT] Injetando servidor C2 e aguardando LAN...
node index.js
pause
