#!/usr/bin/env bash
# =============================================================================
# Dev Container — postCreateCommand
# Runs once when the container is first created (not on every start).
# =============================================================================
set -euo pipefail

info()  { echo -e "\n\033[1;34m▶ $*\033[0m"; }
ok()    { echo -e "  \033[0;32m✔ $*\033[0m"; }
warn()  { echo -e "  \033[0;33m⚠ $*\033[0m"; }
fail()  { echo -e "  \033[0;31m✖ $*\033[0m"; exit 1; }

# ---------------------------------------------------------------------------
# 1. Enable corepack + install the pinned pnpm version
# ---------------------------------------------------------------------------
info "Enabling corepack and installing package manager"
sudo corepack enable || fail "corepack enable failed"
# Ensure pnpm store dir is writable by the node user (Docker layers may create it as root)
sudo mkdir -p /home/node/.local/share/pnpm
sudo chown -R node:node /home/node/.local/share/pnpm
corepack install     || fail "corepack install failed"
ok "pnpm $(pnpm --version) ready"

# ---------------------------------------------------------------------------
# 2. Install workspace dependencies
# ---------------------------------------------------------------------------
info "Installing workspace dependencies (pnpm install)"
pnpm install || fail "pnpm install failed"
ok "Dependencies installed"

# ---------------------------------------------------------------------------
# 3. Install Azure Functions Core Tools globally
#    --unsafe-perm is required because the package runs postinstall scripts
#    that need write access to the global node_modules directory.
# ---------------------------------------------------------------------------
info "Installing Azure Functions Core Tools v4"
sudo npm install -g azure-functions-core-tools@4 --unsafe-perm true \
  || fail "Azure Functions Core Tools install failed"
ok "func $(func --version 2>/dev/null || echo '?') installed"

# ---------------------------------------------------------------------------
# 4. Generate Prisma client
# ---------------------------------------------------------------------------
info "Generating Prisma client"
pnpm db:generate || fail "Prisma generate failed"
ok "Prisma client generated"

# ---------------------------------------------------------------------------
# 5. Apply database migrations
# ---------------------------------------------------------------------------
info "Applying database migrations"
pnpm db:migrate || fail "Prisma migrate failed — is PostgreSQL running?"
ok "Migrations applied"

# ---------------------------------------------------------------------------
# 6. Copy local.settings.json template (skip if already exists)
# ---------------------------------------------------------------------------
info "Checking local.settings.json"
if [ ! -f apps/api/local.settings.json ]; then
  cp apps/api/local.settings.json.example apps/api/local.settings.json
  ok "Created apps/api/local.settings.json from template"
else
  ok "apps/api/local.settings.json already exists — skipped"
fi

echo ""
echo -e "\033[1;32m══════════════════════════════════════════\033[0m"
echo -e "\033[1;32m  Dev container setup complete!           \033[0m"
echo -e "\033[1;32m  Run 'pnpm dev' to start developing.    \033[0m"
echo -e "\033[1;32m══════════════════════════════════════════\033[0m"
