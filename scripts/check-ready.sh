#!/usr/bin/env bash
# =============================================================================
# Dev environment health check
# Verifies that all services and build artifacts are in a working state.
# Usage: pnpm ready
# =============================================================================
set -uo pipefail

PASS=0
WARN=0
FAIL=0

check() {
  local label="$1" cmd="$2" required="${3:-true}"
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "  \033[0;32m✔\033[0m $label"
    ((PASS++))
  elif [ "$required" = "true" ]; then
    echo -e "  \033[0;31m✖\033[0m $label"
    ((FAIL++))
  else
    echo -e "  \033[0;33m⚠\033[0m $label (optional)"
    ((WARN++))
  fi
}

echo -e "\033[1;34m▶ Checking dev environment\033[0m\n"

# Services
echo -e "\033[1mServices:\033[0m"
check "PostgreSQL is reachable"    "pg_isready -h postgres -U allianceops -q"
check "Azurite is reachable"       "nc -z azurite 10000"
check "SignalR emulator reachable" "nc -z signalr-emulator 8888" false

# Build artifacts
echo ""
echo -e "\033[1mBuild artifacts:\033[0m"
check "Shared package is built"    "[ -f packages/shared/dist/index.js ]"
check "Prisma client is generated" "pnpm --filter @allianceops/api exec node -e \"require('@prisma/client')\" 2>/dev/null"

# Configuration
echo ""
echo -e "\033[1mConfiguration:\033[0m"
check "local.settings.json exists"    "[ -f apps/api/local.settings.json ]"
check "TBA_API_KEY is set"            "[ -n \"${TBA_API_KEY:-}\" ]" false
check "DATABASE_URL is set"           "[ -n \"${DATABASE_URL:-}\" ]"

# Tools
echo ""
echo -e "\033[1mTools:\033[0m"
check "pnpm is available"             "command -v pnpm"
check "func (Azure Functions) is available"  "command -v func"
check "Node.js version"               "node --version"

# Summary
echo ""
if [ $FAIL -gt 0 ]; then
  echo -e "\033[0;31m$FAIL failed\033[0m, $PASS passed, $WARN warnings"
  exit 1
elif [ $WARN -gt 0 ]; then
  echo -e "\033[0;32m$PASS passed\033[0m, \033[0;33m$WARN warnings\033[0m"
else
  echo -e "\033[0;32mAll $PASS checks passed!\033[0m"
fi
