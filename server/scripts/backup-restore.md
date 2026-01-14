# MongoDB Atlas - Backup y Restore con mongodump/mongorestore

## 1. Instalar MongoDB Database Tools

### Windows:
```bash
# Descargar desde: https://www.mongodb.com/try/download/database-tools
# O usar Chocolatey:
choco install mongodb-database-tools

# O usar winget:
winget install MongoDB.DatabaseTools
```

### Verificar instalación:
```bash
mongodump --version
mongorestore --version
```

## 2. Respaldo con mongodump

### Sintaxis básica:
```bash
mongodump --uri="mongodb+srv://user:password@cluster.mongodb.net/database" --out=/ruta/backup
```

### Comando para Ghost League:
```bash
mongodump --uri="mongodb+srv://andresdavidguerramosqueda_db_user:3tEcocu37v1xqdrL@ghostleague-cluster.mm2dqug.mongodb.net/ghostleague" --out=./backups
```

### Opciones útiles:
```bash
# Respaldo de colecciones específicas
mongodump --uri="..." --collection=users --out=./backups

# Respaldo con compresión (gzip)
mongodump --uri="..." --gzip --out=./backups

# Respaldo con fecha
mongodump --uri="..." --out="./backups/$(date +%Y%m%d_%H%M%S)"
```

## 3. Restauración con mongorestore

### Sintaxis básica:
```bash
mongorestore --uri="mongodb+srv://user:password@cluster.mongodb.net/database" /ruta/backup/database
```

### Comando para Ghost League:
```bash
mongorestore --uri="mongodb+srv://andresdavidguerramosqueda_db_user:3tEcocu37v1xqdrL@ghostleague-cluster.mm2dqug.mongodb.net/ghostleague" ./backups/ghostleague
```

### Opciones útiles:
```bash
# Restaurar desde backup comprimido
mongorestore --uri="..." --gzip ./backups/ghostleague

# Restaurar colección específica
mongorestore --uri="..." --collection=users ./backups/ghostleague/users.bson

# Restaurar sobrescribiendo datos existentes
mongorestore --uri="..." --drop ./backups/ghostleague

# Restaurar en otra base de datos
mongorestore --uri="..." --nsFrom="ghostleague.*" --nsTo="ghostleague_backup.*" ./backups/ghostleague
```

## 4. Scripts Automatizados

### Script de Backup (backup.sh):
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/backup_$DATE"

echo "🔄 Creando backup: $BACKUP_DIR"
mkdir -p $BACKUP_DIR

mongodump \
  --uri="mongodb+srv://andresdavidguerramosqueda_db_user:3tEcocu37v1xqdrL@ghostleague-cluster.mm2dqug.mongodb.net/ghostleague" \
  --gzip \
  --out=$BACKUP_DIR

echo "✅ Backup completado: $BACKUP_DIR"
echo "📊 Tamaño: $(du -sh $BACKUP_DIR | cut -f1)"
```

### Script de Restore (restore.sh):
```bash
#!/bin/bash
BACKUP_DIR=$1

if [ -z "$BACKUP_DIR" ]; then
  echo "❌ Uso: ./restore.sh /ruta/al/backup"
  exit 1
fi

echo "🔄 Restaurando desde: $BACKUP_DIR"
mongorestore \
  --uri="mongodb+srv://andresdavidguerramosqueda_db_user:3tEcocu37v1xqdrL@ghostleague-cluster.mm2dqug.mongodb.net/ghostleague" \
  --drop \
  --gzip \
  $BACKUP_DIR/ghostleague

echo "✅ Restauración completada"
```

## 5. Ejemplos Prácticos

### Backup completo:
```bash
# Crear backup con fecha actual
mongodump --uri="mongodb+srv://andresdavidguerramosqueda_db_user:3tEcocu37v1xqdrL@ghostleague-cluster.mm2dqug.mongodb.net/ghostleague" --gzip --out="./backups/$(date +%Y%m%d)"
```

### Restore completo:
```bash
# Restaurar último backup
mongorestore --uri="mongodb+srv://andresdavidguerramosqueda_db_user:3tEcocu37v1xqdrL@ghostleague-cluster.mm2dqug.mongodb.net/ghostleague" --drop --gzip ./backups/20240111/ghostleague
```

### Backup de usuarios específicos:
```bash
# Exportar usuarios a JSON
mongoexport --uri="mongodb+srv://andresdavidguerramosqueda_db_user:3tEcocu37v1xqdrL@ghostleague-cluster.mm2dqug.mongodb.net/ghostleague" --collection=users --out=./exports/users.json
```

### Restore de usuarios:
```bash
# Importar usuarios desde JSON
mongoimport --uri="mongodb+srv://andresdavidguerramosqueda_db_user:3tEcocu37v1xqdrL@ghostleague-cluster.mm2dqug.mongodb.net/ghostleague" --collection=users --file=./exports/users.json --upsert
```

## 6. Automatización con npm scripts

Agregar a package.json:
```json
{
  "scripts": {
    "backup": "node scripts/backup.js",
    "restore": "node scripts/restore.js",
    "backup-users": "mongodump --uri=\"mongodb+srv://andresdavidguerramosqueda_db_user:3tEcocu37v1xqdrL@ghostleague-cluster.mm2dqug.mongodb.net/ghostleague\" --collection=users --out=./backups",
    "restore-users": "mongorestore --uri=\"mongodb+srv://andresdavidguerramosqueda_db_user:3tEcocu37v1xqdrL@ghostleague-cluster.mm2dqug.mongodb.net/ghostleague\" --drop ./backups/ghostleague/users.bson"
  }
}
```

## 7. Buenas Prácticas

### Seguridad:
- Guardar credenciales en variables de entorno
- No commitear backups en el repositorio
- Encriptar backups sensibles

### Automatización:
- Programar backups automáticos (cron jobs)
- Rotar backups antiguos
- Monitorear espacio en disco

### Validación:
- Verificar integridad del backup
- Probar restore en entorno de prueba
- Documentar proceso de recuperación

## 8. Troubleshooting

### Errores comunes:
```bash
# Error de autenticación
# Solución: Verificar URI y credenciales

# Error de permisos
# Solución: Verificar permisos del usuario en MongoDB Atlas

# Error de red
# Solución: Verificar whitelist de IPs en MongoDB Atlas

# Error de espacio
# Solución: Liberar espacio en disco o usar --gzip
```

### Verificar backup:
```bash
# Listar colecciones en backup
ls -la ./backups/ghostleague/

# Verificar contenido BSON
bsondump ./backups/ghostleague/users.bson
```
