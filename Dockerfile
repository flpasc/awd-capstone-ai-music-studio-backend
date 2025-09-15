# backend/Dockerfile
FROM node:22-alpine AS base

# install dependencies
RUN apk add --no-cache libc6-compat ffmpeg
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# Build stage
FROM base AS builder
ENV NODE_ENV=production
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS production

RUN apk add --no-cache dumb-init
WORKDIR /app

# Create user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy only necessary files
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 3001
ENV NODE_ENV=production
CMD ["dumb-init", "node", "dist/main"]