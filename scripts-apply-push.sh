#!/bin/bash
# Aplica o lado servidor das push notifications no projeto next-point (Supabase).
# 1) migration (pg_net + trigger)  2) secret da função  3) deploy da Edge Function send-push
set -e
cd ~/next-point
export SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token)
REF=aymztftngjojdjnwkgyn
API="https://api.supabase.com/v1/projects/$REF/database/query"
q() { curl -s -X POST "$API" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -d "$(python3 -c 'import json,sys; print(json.dumps({"query": sys.argv[1]}))' "$1")"; echo; }

echo "== 1/3 migration =="
q "$(cat supabase/migrations/20260916000000_push_notifications.sql)"
q "insert into supabase_migrations.schema_migrations(version, name) values ('20260916000000','push_notifications') on conflict do nothing;"
q "select tgname, tgenabled from pg_trigger where tgname='notifications_send_push';"

echo "== 2/3 secret da função =="
SECRET=$(q "select decrypted_secret s from vault.decrypted_secrets where name='send_push_webhook_secret';" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['s'])")
npx supabase secrets set PUSH_WEBHOOK_SECRET="$SECRET" --project-ref $REF

echo "== 3/3 deploy send-push =="
npx supabase functions deploy send-push --no-verify-jwt --project-ref $REF

echo "== teste: função rejeita chamada sem segredo (esperado 401) =="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "https://$REF.supabase.co/functions/v1/send-push" -H "Content-Type: application/json" -d '{}'
