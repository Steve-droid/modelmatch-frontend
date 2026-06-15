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
# Pinned by digest for reproducibility: this `stable-alpine` (alpine 3.23.x) scans clean
# on the Trivy CRITICAL+HIGH gate WITHOUT an `apk upgrade`, so the image is both
# reproducible and patched. MAINTENANCE: when Trivy later flags this frozen base, refresh
# the digest to the current `stable-alpine` (re-pin), don't add a time-dependent upgrade.
FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:de3e40ec8b7debd7194fc798d4bbfb102c7f8b012b2c73032816b5f72393acdd AS runtime
USER root
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY --chmod=0755 docker-entrypoint.d/40-config-js.sh /docker-entrypoint.d/40-config-js.sh
# The startup hook (40-config-js.sh) regenerates /config.js as uid 101 → the html dir
# must be writable by that user (COPY lands root-owned by default).
RUN chown -R 101:101 /usr/share/nginx/html
USER 101
EXPOSE 8080
