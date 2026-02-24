#!/usr/bin/env bash
set -euo pipefail

# simulate-deploy.sh — Reproduce the deploy pipeline packaging locally to catch
# missing modules and ESM/CJS issues before pushing to GitHub Actions.
#
# Usage:
#   pnpm simulate-deploy              # full simulation (build + package + test)
#   pnpm simulate-deploy --skip-build # skip build, use existing dist/
#
# What this does:
#   1. Clean build (shared → api) — same as CI build job
#   2. Generate Prisma client — same as CI deploy job
#   3. Copy node_modules to temp dir, prune, package zip
#   4. Extract zip and attempt Node.js import — catches runtime errors
#
# Requires: node, pnpm, zip, unzip

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_DIR="/tmp/aops-deploy-test"
SKIP_BUILD=false

for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

step() { echo -e "\n${CYAN}▸ $1${NC}"; }
ok()   { echo -e "${GREEN}  ✔ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
fail() { echo -e "${RED}  ✘ $1${NC}"; }

cleanup() {
  rm -rf "$TEST_DIR" /tmp/aops-api-deploy.zip /tmp/aops-zip-listing.txt
}
trap cleanup EXIT

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Deploy Pipeline Simulation${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ERRORS=0

# ── Step 1: Build ──────────────────────────────────────────

if [ "$SKIP_BUILD" = false ]; then
  step "Building all packages (pnpm build)"
  cd "$ROOT_DIR"
  pnpm db:generate 2>&1 | tail -3
  pnpm build 2>&1 | tail -5
  ok "Build complete"
else
  step "Skipping build (--skip-build)"
fi

# ── Step 2: Verify build artifacts exist ───────────────────

step "Checking build artifacts"

for artifact in \
  "packages/shared/dist/index.js" \
  "apps/api/dist/src/index.js"; do
  if [ ! -f "$ROOT_DIR/$artifact" ]; then
    fail "Missing: $artifact"
    ERRORS=1
  else
    ok "$artifact"
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  fail "Build artifacts missing. Run without --skip-build."
  exit 1
fi

# ── Step 3: Generate Prisma client (same as deploy job) ───

step "Generating Prisma client"
cd "$ROOT_DIR/apps/api"
npx prisma generate 2>&1 | tail -3
ok "Prisma client generated"

# ── Step 4: Package the zip (same command as deploy job) ──

step "Packaging Function App zip"
cd "$ROOT_DIR/apps/api"
rm -f /tmp/aops-api-deploy.zip
zip -r /tmp/aops-api-deploy.zip dist/ host.json package.json node_modules/ \
  -x "node_modules/.cache/*" > /dev/null
ZIP_SIZE=$(du -h /tmp/aops-api-deploy.zip | cut -f1)
ok "Created api-deploy.zip ($ZIP_SIZE)"

# ── Step 5: Verify zip contents ───────────────────────────

step "Verifying zip contents"

# Save listing once — avoids pipefail + grep -q SIGPIPE issue
ZIP_LISTING="/tmp/aops-zip-listing.txt"
unzip -l /tmp/aops-api-deploy.zip > "$ZIP_LISTING"

# Check API entry point
if grep -q "dist/src/index.js" "$ZIP_LISTING"; then
  ok "dist/src/index.js entry point present"
else
  fail "dist/src/index.js entry point MISSING"
  ERRORS=$((ERRORS + 1))
fi

# Check shared package dist
if grep -q "@allianceops/shared/dist/index.js" "$ZIP_LISTING"; then
  ok "@allianceops/shared/dist/index.js present"
else
  if grep -q "shared/dist/index.js" "$ZIP_LISTING"; then
    ok "shared/dist/index.js present (via symlink)"
  else
    fail "@allianceops/shared/dist/index.js MISSING from zip"
    ERRORS=$((ERRORS + 1))
  fi
fi

# Check Prisma generated client
if grep -q ".prisma/client" "$ZIP_LISTING"; then
  ok ".prisma/client (generated) present"
else
  fail ".prisma/client (generated) MISSING from zip"
  ERRORS=$((ERRORS + 1))
fi

# Check host.json
if grep -q "host.json" "$ZIP_LISTING"; then
  ok "host.json present"
else
  fail "host.json MISSING"
  ERRORS=$((ERRORS + 1))
fi

rm -f "$ZIP_LISTING"

# ── Step 6: Extract and test Node.js import ──────────────

step "Testing Function App entry point (Node.js import)"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"
unzip -q /tmp/aops-api-deploy.zip

# Create a package.json so Node treats .js files as ESM
echo '{"type":"module"}' > package.json

# Try importing the entry point — this catches ESM/CJS issues
IMPORT_RESULT=$(node --input-type=module -e "
  try {
    await import('./dist/src/index.js');
    console.log('SUCCESS');
  } catch(e) {
    // These errors are expected without a running DB / App Insights:
    const expected = [
      'DATABASE_URL',
      'APPLICATIONINSIGHTS',
      'Can\\'t reach database',
      'connect ECONNREFUSED',
      '@opentelemetry',
      'FUNCTIONS_WORKER_RUNTIME',
    ];
    const msg = e.message || '';
    if (expected.some(k => msg.includes(k))) {
      console.log('SUCCESS_WITH_EXPECTED_ERROR: ' + msg.substring(0, 120));
    } else {
      console.log('FAILED: ' + msg);
      process.exit(1);
    }
  }
" 2>&1) || true

if echo "$IMPORT_RESULT" | grep -q "^SUCCESS"; then
  ok "Entry point imports successfully"
  if echo "$IMPORT_RESULT" | grep -q "SUCCESS_WITH_EXPECTED_ERROR"; then
    DETAIL=$(echo "$IMPORT_RESULT" | sed 's/SUCCESS_WITH_EXPECTED_ERROR: //')
    warn "Expected runtime error (no DB): ${DETAIL:0:80}..."
  fi
else
  fail "Entry point import FAILED:"
  echo "$IMPORT_RESULT" | head -10
  ERRORS=$((ERRORS + 1))
fi

# ── Cleanup temp files ────────────────────────────────────

rm -rf "$TEST_DIR"
rm -f /tmp/aops-api-deploy.zip

# ── Summary ───────────────────────────────────────────────

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}  ✔ Deploy simulation PASSED${NC}"
  echo -e "${GREEN}    Safe to push to deploy branch${NC}"
else
  echo -e "${RED}  ✘ Deploy simulation FAILED ($ERRORS errors)${NC}"
  echo -e "${RED}    Fix the issues above before pushing${NC}"
fi
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Note: EXIT trap will restore dev deps

exit $ERRORS
