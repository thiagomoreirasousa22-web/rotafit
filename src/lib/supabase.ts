import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { toByteArray } from 'base64-js';
import { AppState } from 'react-native';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
export const cloudConfigured = Boolean(
  url &&
  /^https:\/\//.test(url) &&
  !url.includes('SEU-PROJETO') &&
  key &&
  (key.startsWith('sb_publishable_') || isAnonKey(key)),
);
function isAnonKey(value: string) {
  if (!value.startsWith('eyJ')) return false;
  try {
    const payload = value.split('.')[1];
    const bytes = toByteArray(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='));
    return JSON.parse(String.fromCharCode(...bytes)).role === 'anon';
  } catch {
    return false;
  }
}
export const supabase = createClient(
  cloudConfigured && url ? url : 'https://localhost',
  cloudConfigured && key ? key : 'local-mode',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: cloudConfigured,
      persistSession: cloudConfigured,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);
// Renova o token só enquanto o app está em primeiro plano.
if (cloudConfigured)
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
