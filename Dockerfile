## Multi-stage build for Casatunes Alternate UI (React -> Nginx Alpine)
FROM node:20-alpine AS build
WORKDIR /app

# Install build dependencies only (use npm ci for reproducible builds)
COPY ui/package*.json ./
COPY ui/tsconfig.json ./
# Copy env example if present (non-fatal if missing)
COPY ui/.env.example ./
RUN npm ci --no-audit --no-fund

# Copy source
COPY ui/ ./

# Build-time API base + port overrides (baked into bundle)
ARG REACT_APP_API_BASE
ARG REACT_APP_API_PORT
ENV REACT_APP_API_BASE=${REACT_APP_API_BASE}
ENV REACT_APP_API_PORT=${REACT_APP_API_PORT}
RUN npm run build

FROM nginx:1.29.0-alpine-slim AS runtime
LABEL org.opencontainers.image.title="Casatunes Alternate UI" \
      org.opencontainers.image.description="Stateless React UI for controlling Casatunes" \
      org.opencontainers.image.source="https://example.local/placeholder" \
      org.opencontainers.image.licenses="MIT"

# Copy custom nginx config (SPA + long cache for hashed assets)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy build output
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
