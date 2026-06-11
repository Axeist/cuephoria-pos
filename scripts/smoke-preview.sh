#!/usr/bin/env bash
# Preview / post-deploy smoke checklist for Cuephoria POS.
# Usage: PREVIEW_URL=https://your-preview.vercel.app ./scripts/smoke-preview.sh

set -euo pipefail

BASE="${PREVIEW_URL:-http://localhost:4173}"
BASE="${BASE%/}"

echo "Smoke testing: $BASE"
echo ""

pass=0
fail=0

check() {
  local name="$1"
  local url="$2"
  local expect="${3:-200}"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || echo "000")"
  if [[ "$code" == "$expect" ]]; then
    echo "  OK  $name ($code)"
    pass=$((pass + 1))
  else
    echo "  FAIL $name (expected $expect, got $code) — $url"
    fail=$((fail + 1))
  fi
}

echo "Static / SPA"
check "Home" "$BASE/"
check "Login page" "$BASE/login"
check "build-meta.json" "$BASE/build-meta.json"

echo ""
echo "API health (unauthenticated — expect 401/405, not 500)"
check "admin/me" "$BASE/api/admin/me" "401"
check "admin/login POST guard" "$BASE/api/admin/login" "405"

echo ""
echo "--- Manual checks (required before prod) ---"
echo "  [ ] Login as owner + employee test accounts"
echo "  [ ] POS checkout (cash + UPI)"
echo "  [ ] Employee role: products delete hidden, reports tabs restricted"
echo "  [ ] Public booking page loads"
echo "  [ ] RBAC route log-only: check console for [RBAC] denied path (no redirect)"
echo "  [ ] Staff HR tabs respect role permissions"
echo ""

if [[ "$fail" -gt 0 ]]; then
  echo "Automated checks: $pass passed, $fail failed"
  exit 1
fi

echo "Automated checks: $pass passed"
echo "Complete the manual checklist above before promoting to production."
