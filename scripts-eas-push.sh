#!/bin/bash
# Sobe o google-services.json como env var de ARQUIVO no EAS (3 ambientes).
# A chave FCM V1 (fcm-service-account.json) é enviada em seguida pelo menu interativo.
set -e
cd ~/next-point
export EXPO_TOKEN=$(cat ~/.expo/token)
for ENV in preview production development; do
  echo "== GOOGLE_SERVICES_JSON → $ENV =="
  eas env:create --scope project --environment $ENV --name GOOGLE_SERVICES_JSON \
    --type file --value ./google-services.json --visibility secret --non-interactive 2>&1 | grep -v "eas-cli@\|To upgrade\|npm install -g\|outdated\|^$" | tail -1 || true
done
echo; echo "== conferindo =="
eas env:list --environment preview 2>&1 | grep -i google
