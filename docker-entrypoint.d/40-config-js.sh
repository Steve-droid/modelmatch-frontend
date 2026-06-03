#!/bin/sh
# Regenerate the runtime config from the environment at container start.
# Runs via the nginx image's /docker-entrypoint.d/ mechanism, before nginx boots.
set -e

: "${API_BASE_URL:=http://localhost:8000}"

cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = { apiBaseUrl: "${API_BASE_URL}" };
EOF
