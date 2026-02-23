# ==============================
# STAGE 1 — BUILD STAGE
# ==============================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build NestJS project
RUN npm run build


# ==============================
# STAGE 2 — PRODUCTION RUNTIME
# ==============================
FROM node:20-alpine AS runner

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy environment file if needed (optional)
# COPY .env .env

EXPOSE 3000

# Run compiled NestJS app
CMD ["node", "dist/main.js"]