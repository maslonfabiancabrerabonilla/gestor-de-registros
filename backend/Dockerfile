# ============================================================
# backend/Dockerfile — Imagen multi-stage para SGD-UCI API
# Stage 1 (builder): instala dependencias npm
# Stage 2 (runtime): imagen mínima, usuario no-root
# ============================================================

# ── Stage 1: Builder ─────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar solo manifiestos para aprovechar la caché de capas
# context = ./backend  →  package*.json está en la raíz del contexto
COPY package*.json ./

# Instalación limpia y reproducible de dependencias
RUN npm install

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM node:18-alpine AS runtime

WORKDIR /app

# Ejecutar como usuario no-root (incluido en la imagen node)
USER node

# Copiar node_modules desde el builder con propietario correcto
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# package.json es necesario para que "npm run dev" encuentre los scripts
COPY --chown=node:node package*.json ./

# Copiar código fuente
# context = ./backend  →  src/ está en la raíz del contexto (NO backend/src)
COPY --chown=node:node src ./src

# Puerto interno del servidor Express
EXPOSE 5000

# Healthcheck: verifica que /health responde 200
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode) })"

# Comando de producción (en dev lo sobreescribe docker-compose command: npm run dev)
CMD ["node", "src/index.js"]
