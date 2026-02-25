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
#   2. Create staging directory with npm (flat node_modules) — same as CI deploy
#   3. Generate Prisma client in staging
#   4. Package zip and verify contents
#   5. Extract zip and attempt Node.js import — catches runtime errors
#
# Requires: node, npm, pnpm, zip, unzip

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STAGING="/tmp/aops-api-staging"
TEST_DIR="/tmp/aops-deploy-test"
ZIP_FILE="/tmp/aops-api-deploy.zip"
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
  rm -rf "$STAGING" "$TEST_DIR" "$ZIP_FILE" /tmp/aops-zip-listing.txt
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
  "apps/api/dist/index.js"; do
  if [ ! -f "$ROOT_DIR/$artifact" ]; then
    fail "Missing: $artifact"
    ERRORS=1
  else
    SIZE=$(du -h "$ROOT_DIR/$artifact" | cut -f1)
    ok "$artifact ($SIZE)"
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  fail "Build artifacts missing. Run without --skip-build."
  exit 1
fi

# ── Step 3: Create staging directory ───────────────────────
# Mirrors the deploy workflow: esbuild bundle has @allianceops/shared and dotenv
# inlined. Only 3 external deps need npm install.

step "Creating staging directory (npm install for external deps)"
rm -rf "$STAGING"
mkdir -p "$STAGING"

# Copy bundle and config
cp -r "$ROOT_DIR/apps/api/dist" "$STAGING/dist"
cp "$ROOT_DIR/apps/api/host.json" "$STAGING/"
cp -r "$ROOT_DIR/apps/api/prisma" "$STAGING/"

# Strip devDependencies (contains workspace:* protocol npm can't resolve)
node -e "
  const pkg = JSON.parse(require('fs').readFileSync('$ROOT_DIR/apps/api/package.json', 'utf8'));
  delete pkg.devDependencies;
  require('fs').writeFileSync('$STAGING/package.json', JSON.stringify(pkg, null, 2));
"

# Install with npm — creates flat node_modules with all transitive deps
cd "$STAGING"
npm install --omit=dev 2>&1 | tail -5
ok "npm install complete"

# ── Step 4: Generate Prisma client in staging ─────────────

step "Generating Prisma client in staging"
cd "$STAGING"
npx -y prisma@^6 generate 2>&1 | tail -3
ok "Prisma client generated"

# ── Step 5: Package the zip ───────────────────────────────

step "Packaging Function App zip"
cd "$STAGING"
rm -f "$ZIP_FILE"
zip -r "$ZIP_FILE" dist/ host.json package.json node_modules/ \
  -x "node_modules/.cache/*" > /dev/null
ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)
ok "Created api-deploy.zip ($ZIP_SIZE)"

# ── Step 6: Verify zip contents ───────────────────────────

step "Verifying zip contents"

# Save listing once — avoids pipefail + grep -q SIGPIPE issue
ZIP_LISTING="/tmp/aops-zip-listing.txt"
unzip -l "$ZIP_FILE" > "$ZIP_LISTING"

# Check API entry point (esbuild bundle)
if grep -qF "dist/index.js" "$ZIP_LISTING"; then
  ok "dist/index.js bundle present"
else
  fail "dist/index.js bundle MISSING"
  ERRORS=$((ERRORS + 1))
fi

# Verify @allianceops/shared is NOT in node_modules (should be inlined)
if grep -qF "@allianceops/shared" "$ZIP_LISTING"; then
  fail "@allianceops/shared found in zip — should be inlined by esbuild"
  ERRORS=$((ERRORS + 1))
else
  ok "@allianceops/shared correctly inlined (not in node_modules)"
fi

# Check Prisma generated client (use -F for fixed string, not regex)
if grep -qF "node_modules/.prisma/client" "$ZIP_LISTING"; then
  ok ".prisma/client (generated) present"
else
  fail ".prisma/client (generated) MISSING from zip"
  ERRORS=$((ERRORS + 1))
fi

# Check @opentelemetry/api (transitive dep of applicationinsights)
if grep -qF "@opentelemetry/api" "$ZIP_LISTING"; then
  ok "@opentelemetry/api (transitive dep) present"
else
  fail "@opentelemetry/api (transitive dep) MISSING from zip"
  ERRORS=$((ERRORS + 1))
fi

# Check host.json
if grep -qF "host.json" "$ZIP_LISTING"; then
  ok "host.json present"
else
  fail "host.json MISSING"
  ERRORS=$((ERRORS + 1))
fi

rm -f "$ZIP_LISTING"

# ── Step 7: Extract and test Node.js import ──────────────

step "Testing Function App entry point (Node.js import)"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"
unzip -q "$ZIP_FILE"

# Create a package.json so Node treats .js files as ESM
echo '{"type":"module"}' > package.json

# Try importing the entry point — this catches ESM/CJS issues
IMPORT_RESULT=$(node --input-type=module -e "
  try {
    await import('./dist/index.js');
    console.log('SUCCESS');
  } catch(e) {
    // These errors are expected without a running DB / App Insights:
    const expected = [
      'DATABASE_URL',
      'APPLICATIONINSIGHTS',
      'Can\\'t reach database',
      'connect ECONNREFUSED',
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

exit $ERRORS
