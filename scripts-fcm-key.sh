#!/bin/bash
# Gera a chave privada da conta de serviço firebase-adminsdk (FCM V1) e salva em
# ~/next-point/fcm-service-account.json (ignorado pelo git). Usa o token da Firebase CLI.
set -e
cd ~/next-point
TOKEN=$(python3 -c "import json,os; print(json.load(open(os.path.expanduser('~/.config/configstore/firebase-tools.json')))['tokens']['access_token'])")
SA="firebase-adminsdk-fbsvc@next-point-6040b.iam.gserviceaccount.com"
RESP=$(curl -s -X POST "https://iam.googleapis.com/v1/projects/next-point-6040b/serviceAccounts/$SA/keys" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"privateKeyType":"TYPE_GOOGLE_CREDENTIALS_FILE","keyAlgorithm":"KEY_ALG_RSA_2048"}')
python3 - "$RESP" <<'PY'
import json,base64,sys
r=json.loads(sys.argv[1])
if 'privateKeyData' not in r: print('ERRO:', json.dumps(r,indent=1)); raise SystemExit(1)
data=base64.b64decode(r['privateKeyData'])
open('fcm-service-account.json','wb').write(data)
j=json.loads(data); print('ok:', j['client_email'], '| key_id', j['private_key_id'][:8]+'…')
PY
chmod 600 fcm-service-account.json
grep -q "fcm-service-account.json" .gitignore || printf 'fcm-service-account.json\n' >> .gitignore
git check-ignore -q fcm-service-account.json && echo "(ignorado pelo git)"
