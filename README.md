# RotaFit

Aplicativo de corrida com GPS, histórico, estatísticas semanais, tema claro/escuro e integração com Spotify. Projeto baseado no guia de Programação para Dispositivos Móveis do Prof. Me. Bruno Assunção Dias (IESB).

## Testar no Android

A versão de teste abre no **modo local** quando o Supabase não está configurado. É possível registrar corridas, consultar o histórico, ver as estatísticas e trocar o tema. As corridas desse modo ficam neste aparelho. Elas não são transferidas automaticamente para uma conta Google.

A rota é desenhada em SVG a partir dos pontos coletados pelo GPS, sem precisar de chave de mapa. Conceda a permissão de localização enquanto usa o app e mantenha a tela da corrida aberta durante o treino. O bundle web serve para prévia da interface.

## Abrir no VS Code

Use Node.js 22.13 ou superior. Na pasta que contém `package.json`, execute:

```powershell
npm.cmd ci
npm.cmd start -- --clear
```

O projeto registra as versões do Expo 57, React Native e módulos nativos no `package-lock.json`. Use um Expo Go compatível para a prévia local. Use um APK próprio ou um development build para testar os retornos do Google e do Spotify.

## Ativar login com Google e sincronização

1. Crie um projeto Supabase para o RotaFit. No SQL Editor, rode [supabase/schema.sql](supabase/schema.sql) uma vez. Ele cria a tabela de corridas, as políticas por usuário e a função `weekly_stats`.
2. No Google Cloud Console, configure o consentimento OAuth e crie um cliente do tipo **Web application**. Em **Authorized redirect URIs**, use a URL de callback exibida pelo Supabase para Google, no formato `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
3. No Supabase, habilite o provedor Google em **Authentication** e preencha as credenciais do Google. Mantenha o Client Secret no painel do Supabase. Em **Authentication → URL Configuration → Redirect URLs**, adicione `rotafit://auth-callback`.
4. Abra o `.env` existente e preencha `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_KEY` com a URL do projeto e a chave pública **publishable** ou **anon**. Se o arquivo ainda não existir, crie-o a partir de `.env.example`.
5. Com um emulador Android ou um celular conectado via USB, execute `npx.cmd expo run:android` na pasta do projeto para testar **Continuar com Google** na versão de desenvolvimento.

O app usa OAuth com PKCE. Com o backend configurado, quem ainda não tem sessão vê **Continuar com Google**. [Guia de retorno OAuth no Supabase](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)

## Ativar o Spotify

1. No [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/), crie uma aplicação Web API, registre `rotafit://spotify-auth` como redirect nativo e autorize os usuários que vão testar. Use exatamente o mesmo redirect no aplicativo e no painel.
2. Preencha `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` no `.env` com o Client ID. O fluxo usa PKCE e guarda os tokens no SecureStore no aparelho.
3. Com um emulador aberto ou um celular conectado via USB com depuração ativada, execute `npx.cmd expo run:android` na pasta do projeto. O comando compila, instala e abre a versão de desenvolvimento. No RotaFit, toque em **Perfil > Conectar Spotify**. Para testar os controles, use uma conta Premium e abra o Spotify em um dispositivo ativo. O Spotify também exige Premium do dono da aplicação em modo de desenvolvimento. [Regras de redirecionamento do Spotify](https://developer.spotify.com/blog/2025-02-12-increasing-the-security-requirements-for-integrating-with-spotify) · [Modo de desenvolvimento](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)

## Testes e APK

```powershell
npm.cmd run typecheck
npm.cmd run test:app -- --runInBand
npm.cmd run test:db
```

Os testes Jest cobrem distância, ritmo, tempo, formato das medidas e a máquina de estados. Os testes PGlite aplicam o esquema SQL localmente e conferem a separação das corridas por usuário.

O [eas.json](eas.json) contém o perfil `preview` para APK. Com o projeto EAS vinculado, rode `npx.cmd eas-cli build --platform android --profile preview`. Para uma versão conectada, cadastre as variáveis públicas do app no ambiente `preview` antes de compilar.

No teste em um aparelho, confirme que o app solicita localização no início da corrida. Faça um percurso curto, pause, retome e salve. Compare o traçado da tela final com o do histórico. Confira o tema após reabrir o app. Na versão conectada, teste Google, a separação entre duas contas e os controles do Spotify com um dispositivo ativo.
