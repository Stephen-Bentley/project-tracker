# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./tsconfig.json

RUN npm run build

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "dist/server.js"]
