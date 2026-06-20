#!/usr/bin/env bash
# Container Integration smoke for the FRONTEND pipeline (P31).
#
# This is the boundary check that the Vitest+RTL+MSW suite cannot give us: the
# freshly-built candidate FRONTEND IMAGE (nginx + the SPA assets) is running in a
# container behind its real entrypoint, the pinned backend dependency (from
# ci/pipeline.env) is running in a sibling container, and we exercise the seam ONLY
# from outside — no jsdom, no MSW, no React test renderer. If the Dockerfile / nginx
# config / runtime /config.js generator / CORS wiring is broken, this stage fails (the
# Vitest suite would still pass).
#
# What it proves (mapped to the P31 brief):
#   1. nginx serves the SPA from the candidate frontend image:
#        GET / -> 200 HTML, body references the SPA mount point + /config.js.
#   2. /config.js is generated AND contains the intended API_BASE_URL:
#        the runtime entrypoint substituted the env var at container start.
#   3. The browser-loaded frontend can reach the backend dependency through the
#      configured URL/CORS:
#        a CORS preflight from the FE origin to API_BASE_URL is honored; a real
#        cross-origin POST works.
#   4. One basic API-backed UI/API path works:
#        register -> login -> authenticated GET of an owner-scoped resource through
#        the API_BASE_URL the SPA would use, with the FE origin in the request.
#
# Fake-LLM only (the compose backend defaults LLM_CLIENT=fake). No live-LLM here.
#
# Env (set by the pipeline):
#   E2E_BASE_URL   frontend base URL on its free host port (default http://localhost:8080)
#   E2E_API_BASE   backend  base URL on its free host port (default http://localhost:8000)
set -euo pipefail

export E2E_BASE_URL="${E2E_BASE_URL:-http://localhost:8080}"
export E2E_API_BASE="${E2E_API_BASE:-http://localhost:8000}"

EMAIL="fe-integ+$(date +%s)@example.com"
PASSWORD="fe-integ-pw-123456"

# Per-run temp file for the cross-origin login response headers (concurrent feature/*
# builds must NOT share a fixed /tmp path; mktemp + trap cleans up on any exit path).
LOGIN_HEADERS=$(mktemp -t fe-int-login-headers.XXXXXXXX)
trap 'rm -f "${LOGIN_HEADERS}"' EXIT

echo "container-integration: frontend at ${E2E_BASE_URL}  backend at ${E2E_API_BASE}"

# Wait briefly for nginx — the existing e2e-stack.sh up gates on the BACKEND /healthz,
# not the FE port, so the SPA may still be starting in the FE container.
for i in $(seq 1 30); do
  if curl -fsS "${E2E_BASE_URL}/config.js" >/dev/null 2>&1; then
    echo "  frontend reachable after ${i} attempt(s)."
    break
  fi
  if [ "$i" = 30 ]; then
    echo "container-integration FAIL: frontend did not serve /config.js in time" >&2
    exit 1
  fi
  sleep 2
done

# 1. nginx serves the SPA.
SPA_BODY=$(curl -fsS "${E2E_BASE_URL}/")
echo "${SPA_BODY}" | grep -q '<div id="root"></div>' \
  || { echo "container-integration FAIL: SPA root mount not present in /" >&2; exit 1; }
echo "${SPA_BODY}" | grep -q '/config.js' \
  || { echo "container-integration FAIL: /config.js script tag missing in /" >&2; exit 1; }
echo "  spa-served ok"

# 2. /config.js contains the intended API_BASE_URL.
CONFIG_JS=$(curl -fsS "${E2E_BASE_URL}/config.js")
echo "  /config.js: ${CONFIG_JS}"
# The compose API_BASE_URL is the same as our smoke's E2E_API_BASE.
echo "${CONFIG_JS}" | grep -F "${E2E_API_BASE}" >/dev/null \
  || { echo "container-integration FAIL: /config.js does not embed ${E2E_API_BASE}" >&2; exit 1; }
echo "${CONFIG_JS}" | grep -q 'apiBaseUrl' \
  || { echo "container-integration FAIL: /config.js missing apiBaseUrl key" >&2; exit 1; }
echo "  config.js ok"

# 3. CORS — the SPA origin (E2E_BASE_URL) hitting the backend must be allowed. A
# preflight OPTIONS against /auth/login is a representative POST endpoint.
PREFLIGHT=$(curl -sS -o /dev/null -D - -X OPTIONS "${E2E_API_BASE}/auth/login" \
  -H "Origin: ${E2E_BASE_URL}" \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type')
echo "${PREFLIGHT}" | tr -d '\r' | grep -i "^access-control-allow-origin: ${E2E_BASE_URL}\$" >/dev/null \
  || { echo "container-integration FAIL: CORS preflight did not allow origin ${E2E_BASE_URL}" >&2; \
       echo "${PREFLIGHT}" >&2; exit 1; }
echo "  cors preflight ok"

# 4. One basic API-backed path WITH the FE origin in the request. Register may 409 on
# a rerun against a persistent DB — only the login round-trip must pass.
curl -fsS -o /dev/null -X POST "${E2E_API_BASE}/auth/register" \
  -H 'content-type: application/json' \
  -H "Origin: ${E2E_BASE_URL}" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  || true

LOGIN_RESP=$(curl -fsS -D "${LOGIN_HEADERS}" -X POST "${E2E_API_BASE}/auth/login" \
  -H 'content-type: application/json' \
  -H "Origin: ${E2E_BASE_URL}" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
TOKEN=$(echo "${LOGIN_RESP}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["accessToken"])')
[ -n "${TOKEN}" ] || { echo "container-integration FAIL: no access token via FE origin" >&2; exit 1; }
# CORS header echoed back on the actual request, too.
tr -d '\r' <"${LOGIN_HEADERS}" | grep -i "^access-control-allow-origin: ${E2E_BASE_URL}\$" >/dev/null \
  || { echo "container-integration FAIL: login response missing CORS allow-origin" >&2; \
       cat "${LOGIN_HEADERS}" >&2; exit 1; }
echo "  cross-origin login ok"

# Authenticated read through the configured API_BASE_URL — proves the FE-image-injected
# URL can in fact serve a real owner-scoped read end-to-end.
PROJECTS=$(curl -fsS "${E2E_API_BASE}/projects" \
  -H "authorization: Bearer ${TOKEN}" \
  -H "Origin: ${E2E_BASE_URL}")
echo "${PROJECTS}" | python3 -c 'import sys,json; v=json.load(sys.stdin); assert isinstance(v, list), v; print(f"  authed /projects ok (count={len(v)})")'

echo "container-integration: PASS"
