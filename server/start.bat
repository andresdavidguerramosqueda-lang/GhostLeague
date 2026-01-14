@echo off
REM Crear directorios de logs si no existen
if not exist logs mkdir logs

REM Instalar PM2 globalmente si no está instalado
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando PM2...
    npm install -g pm2
)

REM Iniciar la aplicación con PM2
echo Iniciando servidor con PM2...
pm2 start ecosystem.config.js

REM Mostrar estado
echo Estado del servidor:
pm2 status

echo.
echo Comandos útiles:
echo Para ver logs en tiempo real: pm2 logs
echo Para detener: pm2 stop liga-dorada-api
echo Para reiniciar: pm2 restart liga-dorada-api
echo Para eliminar: pm2 delete liga-dorada-api
echo Para ver dashboard: pm2 monit
pause
