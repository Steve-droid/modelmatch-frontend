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
# Pinned by digest for reproducibility (alpine 3.23.x). MAINTENANCE: the preferred remedy
# when Trivy flags this frozen base is to refresh the digest to a rebuilt `stable-alpine`.
# But the upstream image lags the alpine repos — when a fix is already published as an apk
# yet NOT baked into any rebuilt base, a digest refresh can't clear the finding. In that
# case remediate with a targeted single-package `apk upgrade` from the pinned 3.23 repo
# (below), and drop it once upstream rebuilds the base with the patch.
# 2026-06-21: CVE-2026-45186 (libexpat, HIGH) — fix 2.8.1-r0 is in v3.23/main, but the
# base (incl. the latest stable-alpine) still ships 2.7.5-r0 → targeted upgrade below.
FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:de3e40ec8b7debd7194fc798d4bbfb102c7f8b012b2c73032816b5f72393acdd AS runtime
USER root
# Security remediation (see base-image note above): pull the patched libexpat
# (CVE-2026-45186 → 2.8.1-r0) from the pinned alpine 3.23 repo. Remove once the upstream
# base is rebuilt with the patch and a plain digest refresh scans clean again.
RUN apk upgrade --no-cache libexpat
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
