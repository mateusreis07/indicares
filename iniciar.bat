@echo off
echo ===================================================
echo   Iniciando o Sistema de Indicadores MPPA...
echo ===================================================
echo.

echo [1/2] Iniciando o Servidor Backend (API)...
start "Backend - Indicadores" cmd /k "cd backend && npm run dev"

echo [2/2] Iniciando o Frontend (React/Vite)...
start "Frontend - Indicadores" cmd /k "cd frontend && npm run dev"

echo.
echo Tudo pronto! O sistema deve abrir no seu navegador em breve.
echo Para fechar tudo, feche as duas novas janelas pretas que abriram.
echo ===================================================
pause
