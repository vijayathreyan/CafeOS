#!/bin/bash
# ============================================================
# CafeOS — Owner accounts seed
# Uses GoTrue admin API to create auth users (correct way).
# jq is used for reliable JSON parsing — no fragile grep.
# Idempotent — skips individual accounts that already exist.
# ============================================================

set -e

DB_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"
AUTH_URL="http://supabase-auth:9999"
SERVICE_KEY="${SERVICE_ROLE_KEY}"

# ── Wait for GoTrue to be ready ───────────────────────────────
echo "[seed] Waiting for GoTrue..."
until curl -sf "${AUTH_URL}/health" > /dev/null 2>&1; do
  sleep 3
done
echo "[seed] GoTrue ready."

# ── Seed function — idempotent per phone number ───────────────
seed_owner() {
  local PHONE="$1"
  local FULL_NAME="$2"
  local EMP_ID="$3"
  local PASSWORD="$4"
  local EMAIL="${PHONE}@cafeos.local"

  # Skip if employee row already exists (phone is unique)
  EXISTING_EMP=$(psql "$DB_URL" -tAc "SELECT id FROM public.employees WHERE phone='${PHONE}'")
  if [ -n "$EXISTING_EMP" ]; then
    echo "[seed] ${FULL_NAME} (${PHONE}) already exists. Skipping."
    return 0
  fi

  echo "[seed] Creating auth user for ${FULL_NAME} (${PHONE})..."
  RESPONSE=$(curl -sf -X POST "${AUTH_URL}/admin/users" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -d "{
      \"email\": \"${EMAIL}\",
      \"password\": \"${PASSWORD}\",
      \"email_confirm\": true,
      \"role\": \"authenticated\"
    }")

  USER_ID=$(echo "$RESPONSE" | jq -r '.id')
  if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
    echo "[seed] ERROR: Could not create auth user for ${FULL_NAME}."
    echo "[seed] GoTrue response: $RESPONSE"
    exit 1
  fi
  echo "[seed] Created auth user: ${USER_ID}"

  echo "[seed] Creating employee row for ${FULL_NAME}..."
  psql -v ON_ERROR_STOP=1 "$DB_URL" <<SQL
INSERT INTO public.employees (
  employee_id, full_name, phone, role,
  branch_access, auth_user_id, active,
  join_date, first_login_done
) VALUES (
  '${EMP_ID}',
  '${FULL_NAME}',
  '${PHONE}',
  'owner',
  ARRAY['KR','C2']::branch_code[],
  '${USER_ID}'::uuid,
  true,
  CURRENT_DATE,
  true
)
ON CONFLICT (phone) DO UPDATE
  SET auth_user_id     = EXCLUDED.auth_user_id,
      active           = true,
      first_login_done = true;
SQL
  echo "[seed] ${FULL_NAME} ready."
}

# ── Seed all owner accounts ───────────────────────────────────
seed_owner "9999999999" "Vijay"   "EMP-001" "Owner@2026"
seed_owner "8122211803" "Jhanani" "EMP-002" "Owner@2026"

echo ""
echo "============================================"
echo "  Owner accounts ready!"
echo "  Vijay   : 9999999999 / Owner@2026"
echo "  Jhanani : 8122211803 / Owner@2026"
echo "============================================"
