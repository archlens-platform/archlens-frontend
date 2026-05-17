FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# next.config.ts evaluates rewrites() at build time, so the internal hostnames
# used to reach the observability stack must already be present here.
ARG INTERNAL_API_URL=http://gateway:8080
ARG INTERNAL_JAEGER_URL=http://jaeger:16686
ARG INTERNAL_PROMETHEUS_URL=http://prometheus:9090
ENV INTERNAL_API_URL=$INTERNAL_API_URL
ENV INTERNAL_JAEGER_URL=$INTERNAL_JAEGER_URL
ENV INTERNAL_PROMETHEUS_URL=$INTERNAL_PROMETHEUS_URL
RUN npx next build

FROM node:22-slim AS runner
LABEL org.opencontainers.image.source="https://github.com/archlens-platform/archlens-frontend"
LABEL org.opencontainers.image.title="ArchLens Frontend"
LABEL org.opencontainers.image.version="1.0.0"
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:3000').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
