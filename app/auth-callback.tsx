import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ErrorState, LoadingView } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { completeGoogleSignIn } from '@/lib/googleAuth';

export default function GoogleAuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { session, localMode, loading } = useAuth();
  const router = useRouter();
  const [failedCode, setFailedCode] = useState<string>();

  useEffect(() => {
    if (loading || session || localMode || typeof code !== 'string' || !code) return;
    let active = true;
    void completeGoogleSignIn(code).catch(() => {
      if (active) setFailedCode(code);
    });
    return () => {
      active = false;
    };
  }, [code, loading, localMode, session]);

  if (loading) return <LoadingView />;
  if (session || localMode) return <Redirect href="/" />;
  if (typeof code !== 'string' || !code || failedCode === code) {
    return (
      <ErrorState
        message="Não foi possível concluir o login com Google. Volte e inicie o login novamente."
        onRetry={() => router.replace('/login')}
      />
    );
  }
  return <LoadingView />;
}
