import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '@/context/AuthContext';
import * as AuthSession from 'expo-auth-session';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { deleteSecureItem, getSecureItem, setSecureItem } from '@/lib/secureStore';
import { SPOTIFY_SCOPES, spotifyClientId, spotifyDiscovery } from '@/lib/spotify';
import type { SpotifyTokens } from '@/types';
interface SpotifyContextValue {
  tokens: SpotifyTokens | null;
  connecting: boolean;
  connect: () => void;
  disconnect: () => Promise<void>;
  getValidAccessToken: () => Promise<string | null>;
}
const SpotifyContext = createContext<SpotifyContextValue | undefined>(undefined);
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'rotafit',
  native: 'rotafit://spotify-auth',
  path: 'spotify-auth',
});
async function saveTokens(storeKey: string, tokens: SpotifyTokens) {
  await setSecureItem(storeKey, JSON.stringify(tokens));
}
async function loadTokens(storeKey: string): Promise<SpotifyTokens | null> {
  const raw = await getSecureItem(storeKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SpotifyTokens;
  } catch {
    return null;
  }
}
// Login e controle de sessão do Spotify. Usa PKCE (sem client secret) e guarda
// os tokens no SecureStore do aparelho — são credenciais de terceiro, mais
// sensíveis que uma preferência qualquer, por isso não vão no AsyncStorage.
export function SpotifyProvider({ children }: { children: ReactNode }) {
  const { user, localMode } = useAuth();
  const account = user?.id ?? (localMode ? 'local' : null);
  let unavailableMessage: string | undefined;
  if (Constants.executionEnvironment === 'storeClient') {
    unavailableMessage = 'Para conectar o Spotify, abra o RotaFit pela versão de desenvolvimento no Android. O Expo Go não consegue receber o retorno do login.';
  } else if (Platform.OS === 'web') {
    unavailableMessage = 'A conexão com Spotify está disponível no aplicativo para celular.';
  } else if (!spotifyClientId) {
    unavailableMessage = 'Configure EXPO_PUBLIC_SPOTIFY_CLIENT_ID no arquivo .env e reinicie o Expo.';
  } else if (!account) {
    unavailableMessage = 'Entre no RotaFit antes de conectar o Spotify.';
  }

  if (unavailableMessage) {
    return (
      <SpotifyContext.Provider
        value={{
          tokens: null,
          connecting: false,
          connect: () => Alert.alert('Spotify', unavailableMessage),
          disconnect: async () => {},
          getValidAccessToken: async () => null,
        }}
      >
        {children}
      </SpotifyContext.Provider>
    );
  }
  return (
    <ConfiguredSpotifyProvider key={account} storeKey={`rotafit.spotify.${account}`}>
      {children}
    </ConfiguredSpotifyProvider>
  );
}
function ConfiguredSpotifyProvider({
  children,
  storeKey,
}: {
  children: ReactNode;
  storeKey: string;
}) {
  const [tokens, setTokens] = useState<SpotifyTokens | null>(null);
  const [connecting, setConnecting] = useState(false);
  const refreshing = useRef<Promise<string | null> | null>(null);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { clientId: spotifyClientId, scopes: SPOTIFY_SCOPES, redirectUri, usePKCE: true },
    spotifyDiscovery,
  );
  useEffect(() => {
    void loadTokens(storeKey)
      .then(setTokens)
      .catch(() => setTokens(null));
  }, [storeKey]);
  useEffect(() => {
    if (response?.type !== 'success' || !request?.codeVerifier) {
      if (response?.type === 'error' || response?.type === 'cancel') setConnecting(false);
      return;
    }
    setConnecting(true);
    AuthSession.exchangeCodeAsync(
      {
        clientId: spotifyClientId,
        code: response.params.code,
        redirectUri,
        extraParams: { code_verifier: request.codeVerifier },
      },
      spotifyDiscovery,
    )
      .then(async (result) => {
        const next: SpotifyTokens = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken ?? '',
          expiresAt: Date.now() + (result.expiresIn ?? 3600) * 1000,
        };
        await saveTokens(storeKey, next);
        setTokens(next);
      })
      .catch(() =>
        Alert.alert(
          'Spotify',
          'Não foi possível concluir a conexão. Confira a autorização da conta e tente novamente.',
        ),
      )
      .finally(() => setConnecting(false));
  }, [response, request, storeKey]);
  const connect = useCallback(() => {
    if (
      !spotifyClientId ||
      Constants.executionEnvironment === 'storeClient' ||
      !request
    ) {
      Alert.alert(
        'Spotify',
        'Configure o Client ID do Spotify e abra um APK do RotaFit.',
      );
      return;
    }
    setConnecting(true);
    void promptAsync()
      .then((result) => {
        if (result.type !== 'success') setConnecting(false);
      })
      .catch(() => setConnecting(false));
  }, [promptAsync, request]);
  const disconnect = useCallback(async () => {
    await deleteSecureItem(storeKey);
    setTokens(null);
  }, [storeKey]);
  // Renova o token de acesso quando falta menos de um minuto para expirar, e
  // devolve um token pronto para uso (ou null, se não há conta conectada).
  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    if (!tokens) return null;
    if (tokens.expiresAt - Date.now() > 60_000) return tokens.accessToken;
    if (!refreshing.current) {
      refreshing.current = AuthSession.refreshAsync(
        { clientId: spotifyClientId, refreshToken: tokens.refreshToken },
        spotifyDiscovery,
      )
        .then(async (result) => {
          const next: SpotifyTokens = {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken ?? tokens.refreshToken,
            expiresAt: Date.now() + (result.expiresIn ?? 3600) * 1000,
          };
          await saveTokens(storeKey, next);
          setTokens(next);
          return next.accessToken;
        })
        .catch(async () => {
          // Refresh token revogado ou expirado: peça para conectar de novo.
          await disconnect();
          return null;
        })
        .finally(() => {
          refreshing.current = null;
        });
    }
    return refreshing.current;
  }, [tokens, disconnect, storeKey]);
  const value = useMemo(
    () => ({ tokens, connecting, connect, disconnect, getValidAccessToken }),
    [tokens, connecting, connect, disconnect, getValidAccessToken],
  );
  return <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>;
}
export function useSpotify(): SpotifyContextValue {
  const context = useContext(SpotifyContext);
  if (!context) throw new Error('useSpotify deve ser usado dentro de <SpotifyProvider>');
  return context;
}
