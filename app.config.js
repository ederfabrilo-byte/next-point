// Config dinâmica em cima do app.json (o Expo passa o app.json em `config`).
//
// Só existe por um motivo: o google-services.json (FCM, push no Android) não
// pode ir para o git — o repo é público. Localmente ele fica na raiz
// (ignorado pelo .gitignore); no EAS chega pela env var de ARQUIVO
// GOOGLE_SERVICES_JSON (`eas env:create --scope project --type file`).
// Se não existir em nenhum dos dois lugares, o build sai sem FCM e o push
// simplesmente não funciona — mas o app compila.
const fs = require('fs');

const googleServices = process.env.GOOGLE_SERVICES_JSON || './google-services.json';
const hasGoogleServices = fs.existsSync(googleServices);

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(hasGoogleServices ? { googleServicesFile: googleServices } : {}),
  },
});
