@echo off
title Caisse Theatre de l'IA - Serveur
cd /d "%~dp0"

if not exist ".next" (
    echo L'application n'a pas encore ete construite.
    echo Lancez : npm install puis npm run build
    pause
    exit /b
)

echo Demarrage du serveur...
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
echo Le navigateur va s'ouvrir automatiquement dans quelques secondes.
echo Fermez cette fenetre pour arreter l'application.
echo.
call npm run start
pause
