# syntax=docker/dockerfile:1

# --- build: compile the Vite app ---
# Digest-pinned (node 22.20.0-alpine) so the production dist is built reproducibly.
FROM node:22.20.0-alpine@sha256:dbcedd8aeab47fbc0f4dd4bffa55b7c3c729a707875968d467aaaea42d6225af AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime: non-root nginx serving static assets ---
# nginx-unprivileged runs as uid 101 and listens on 8080 (no root needed).
# Refreshed 2026-09-09 after the P38k release scan found fixable HIGH CVEs in the
# old base's c-ares/curl/OpenSSL/libuuid packages. nginx 1.30.4 on Alpine 3.24.1;
# keep the immutable digest and rescan the final image before publishing.
FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:442753882674b49ae2c1de83ed67896131c0777f56df5005e356e62bc3f7e7ce AS runtime
USER root
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker-entrypoint.d/40-config-js.sh /docker-entrypoint.d/40-config-js.sh
# The startup hook (40-config-js.sh) regenerates /config.js as uid 101 → the html dir
# must be writable by that user (COPY lands root-owned by default). chmod the hook in a
# RUN (not COPY --chmod, which needs BuildKit — the controller uses the legacy builder).
RUN chown -R 101:101 /usr/share/nginx/html \
 && chmod 0755 /docker-entrypoint.d/40-config-js.sh
USER 101
EXPOSE 8080
