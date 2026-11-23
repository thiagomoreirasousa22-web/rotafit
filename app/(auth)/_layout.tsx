import { Redirect, Stack } from 'expo-router';
import { LoadingView } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
export default function AuthLayout() {
  const { session, localMode, loading } = useAuth();
  if (loading) return <LoadingView />;
  if (session || localMode) return <Redirect href="/" />; // já logado: vai para o app
  return <Stack screenOptions={{ headerShown: false }} />;
}
