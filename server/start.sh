#!/bin/bash

# Crear directorios de logs si no existen
mkdir -p logs

# Instalar PM2 globalmente si no está instalado
if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2..."
    npm install -g pm2
fi

# Iniciar la aplicación con PM2
echo "Iniciando servidor con PM2..."
pm2 start ecosystem.config.js

# Mostrar estado
echo "Estado del servidor:"
pm2 status

# Mostrar logs en tiempo real
echo "Para ver logs en tiempo real: pm2 logs"
echo "Para detener: pm2 stop liga-dorada-api"
echo "Para reiniciar: pm2 restart liga-dorada-api"
echo "Para eliminar: pm2 delete liga-dorada-api"
