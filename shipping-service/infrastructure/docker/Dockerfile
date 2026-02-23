# ----------------------------------------------------
# STAGE 1 — BUILD
# ----------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# copy source
COPY . .

# build NestJS
RUN npm run build


# ----------------------------------------------------
# STAGE 2 — PRODUCTION RUNTIME
# ----------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# copy only needed files
COPY package*.json ./
RUN npm install --omit=dev

# copy compiled code from builder
COPY --from=builder /app/dist ./dist

# copy any runtime assets if needed
# (example: migrations, static config, etc.)
COPY --from=builder /app/src/database ./src/database

# port used by NestJS
EXPOSE 3000

CMD ["node", "dist/main.js"]