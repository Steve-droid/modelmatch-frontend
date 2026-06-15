#!/usr/bin/env bash
# Print N free TCP ports (default 2), space-separated, on one line.
#
# Why: the E2E stage must know the host ports BEFORE `compose up` (the FE image bakes its
# API URL, and the backend its PUBLIC_BASE_URL/CORS, from env at start), so we can't let
# Docker pick random ports after the fact. Binding to port 0 lets the OS hand us distinct
# free ports; binding all sockets simultaneously guarantees they differ. There's a small
# TOCTOU window between release here and `compose up` binding — acceptable for CI, and far
# safer than ports derived from a per-branch BUILD_NUMBER (which collide across branches).
set -euo pipefail
n="${1:-2}"
python3 - "$n" <<'PY'
import socket, sys
n = int(sys.argv[1])
socks = [socket.socket() for _ in range(n)]
for s in socks:
    s.bind(("", 0))
print(" ".join(str(s.getsockname()[1]) for s in socks))
for s in socks:
    s.close()
PY
