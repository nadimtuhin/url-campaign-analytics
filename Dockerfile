# Use Node.js LTS version
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./

# Install production dependencies only
RUN npm install --production

# Generate Prisma client in production
RUN npx prisma generate

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Create a shell script to run migrations and start the server
RUN echo '#!/bin/sh\nnpx prisma migrate deploy\nnpm start' > /app/start.sh && chmod +x /app/start.sh

# Start the application using the shell script
CMD ["/app/start.sh"]