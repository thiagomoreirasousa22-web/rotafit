import { Redirect } from 'expo-router';
import { LoadingView } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { useSpotify } from '@/context/SpotifyContext';

export default function SpotifyAuthCallback() {
  const { loading } = useAuth();
  const { connecting } = useSpotify();

  // AuthSession validates the callback and exchanges the code in SpotifyProvider.
  if (loading || connecting) return <LoadingView />;
  return <Redirect href="/profile" />;
}
