FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install dependencies
WORKDIR /app/backend
RUN npm ci

# Copy backend source
COPY backend/ ./
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install production dependencies only
WORKDIR /app/backend
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/backend/dist ./dist

# Copy frontend files (HTML, CSS, JS, Images)
WORKDIR /app
COPY *.html ./
COPY public/ ./public/
COPY images/ ./images/
COPY js/ ./js/

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Run the server
WORKDIR /app/backend
CMD ["node", "dist/index.js"]
