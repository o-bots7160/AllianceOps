#!/usr/bin/env bash
# =============================================================================
# Dev Container — postStartCommand
# Runs every time the container starts (including restarts / reopens).
# Syncs runtime configuration that depends on other Docker services.
# =============================================================================
set -euo pipefail

info()  { echo -e "\033[1;34m▶ $*\033[0m"; }
ok()    { echo -e "  \033[0;32m✔ $*\033[0m"; }
warn()  { echo -e "  \033[0;33m⚠ $*\033[0m"; }

LOCAL_SETTINGS="apps/api/local.settings.json"

# Bail early if local.settings.json doesn't exist yet (postCreateCommand
# hasn't run, or container is still initialising).
if [ ! -f "$LOCAL_SETTINGS" ]; then
  warn "$LOCAL_SETTINGS not found — skipping env sync"
  exit 0
fi

# ---------------------------------------------------------------------------
# Helper: patch a value in local.settings.json using Node.js
# Usage:  patch_setting <key> <value>
# ---------------------------------------------------------------------------
patch_setting() {
  local key="$1" value="$2"
  node -e "
    const fs = require('fs');
    const p = '$LOCAL_SETTINGS';
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    j.Values = j.Values || {};
    j.Values[process.argv[1]] = process.argv[2];
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  " "$key" "$value"
}

# ---------------------------------------------------------------------------
# 1. Sync SignalR connection string from the emulator's shared volume
#    The entrypoint.sh in the emulator container already rewrites the
#    hostname to the Docker service name — just read it as-is.
# ---------------------------------------------------------------------------
info "Syncing environment to $LOCAL_SETTINGS"

SIGNALR_CS_FILE="/signalr-shared/connection-string"
if [ -f "$SIGNALR_CS_FILE" ]; then
  CS=$(cat "$SIGNALR_CS_FILE")
  if [ -n "$CS" ]; then
    patch_setting "AzureSignalRConnectionString" "$CS"
    ok "SignalR connection string synced"
  else
    warn "SignalR connection string file is empty"
  fi
else
  warn "SignalR emulator not available — realtime features will use polling fallback"
fi

# ---------------------------------------------------------------------------
# 2. Propagate TBA_API_KEY from environment (.env → docker-compose → here)
#    so developers don't have to manually copy it into local.settings.json.
# ---------------------------------------------------------------------------
if [ -n "${TBA_API_KEY:-}" ]; then
  patch_setting "TBA_API_KEY" "$TBA_API_KEY"
  ok "TBA_API_KEY synced from environment"
fi

# ---------------------------------------------------------------------------
# 3. Propagate DATABASE_URL (should already match docker-compose, but keeps
#    local.settings.json in sync if the compose env changes).
# ---------------------------------------------------------------------------
if [ -n "${DATABASE_URL:-}" ]; then
  patch_setting "DATABASE_URL" "$DATABASE_URL"
  ok "DATABASE_URL synced from environment"
fi

echo ""
ok "Environment sync complete"
