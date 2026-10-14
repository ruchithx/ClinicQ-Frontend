FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_PATH
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS
ARG NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS
ARG NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S dms && adduser -S dms -G dms
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER dms
EXPOSE 3000
CMD ["node", "server.js"]
