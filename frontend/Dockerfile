# ==============================================================================
# ProofMesh Frontend Dockerfile (Multi-Stage Build)
# React 19 + Vite Dashboard for Autonomous AI Agent Provenance & Trust Framework
# ==============================================================================

# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors first for caching
COPY package.json package-lock.json* ./

# Install npm dependencies
RUN npm install

# Accept backend API URL as a build argument
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy source code and build the production bundle
COPY . .
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration supporting SPA deep linking
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose web server port
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --quiet --tries=1 --spider http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
