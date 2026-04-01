# Sistema de Gestión Docente UCI

## 🚀 Setup Local (5 minutos)

### Requisitos
- Docker Desktop instalado
- Git

### Pasos

1. Clonar y entrar al directorio:
```bash
git clone <repositorio>
cd sistema-gestion-docente
```

2. Copiar variables de entorno:
```bash
cp .env.example .env.local
```

3. Levantar servicios:
```bash
docker-compose up -d
```

4. Validar salud:
```bash
# Ver logs
docker-compose logs -f api

# Test endpoint health
curl http://localhost:3000/health

# Test listado grupos
curl http://localhost:3000/api/grupos
```

### Comandos Docker

```bash
# Ver estado
docker-compose ps

# Logs backend
docker-compose logs -f api

# Logs PostgreSQL
docker-compose logs -f postgres

# Acceder a BD
docker-compose exec postgres psql -U docente -d docente_db

# Parar servicios
docker-compose down

# Resetear BD (elimina datos)
docker-compose down -v

# Rebuild si cambia Dockerfile
docker-compose build api
docker-compose up -d api
```

## 📊 BD Acceso

| Campo      | Valor                |
|------------|----------------------|
| Host       | localhost            |
| Puerto     | 5432                 |
| Usuario    | docente              |
| Contraseña | docente_dev_password |
| BD         | docente_db           |

```bash
# Conectar directamente
psql -h localhost -U docente -d docente_db
```

