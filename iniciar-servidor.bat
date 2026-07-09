@echo off
title Servidor MPPA (Backend e Frontend)
echo ===================================================
echo   Iniciando Servidor Interno - Indicadores MPPA
echo ===================================================
echo.

echo O IP desta maquina e: 192.168.250.135
echo.

echo [1/2] Iniciando API (Backend) na porta 3333...
start "Servidor API (Nao feche)" cmd /k "cd backend && node server.js"

echo [2/2] Iniciando Interface (Frontend) na porta 3334...
start "Servidor Interface (Nao feche)" cmd /k "cd frontend && npx serve -s dist -l 3334"

echo.
echo ===================================================
echo SERVIDOR ONLINE! 
echo.
echo Avise seus colegas para acessarem o sistema pelo link:
echo http://192.168.250.135:3334
echo.
echo IMPORTANTE:
echo - Essas janelas pretas precisam ficar abertas.
echo - O firewall do Windows precisa liberar as portas 3334 e 3333.
echo ===================================================
pause
