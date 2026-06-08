# syntax=docker/dockerfile:1

# --- build: compile the Vite app ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime: non-root nginx serving static assets ---
# nginx-unprivileged runs as uid 101 and listens on 8080 (no root needed).
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
USER root
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY --chmod=0755 docker-entrypoint.d/40-config-js.sh /docker-entrypoint.d/40-config-js.sh
# The startup hook (40-config-js.sh) regenerates /config.js as uid 101 → the html dir
# must be writable by that user (COPY lands root-owned by default).
RUN chown -R 101:101 /usr/share/nginx/html
USER 101
EXPOSE 8080
