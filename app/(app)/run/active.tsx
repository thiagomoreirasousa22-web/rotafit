import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { Button } from '@/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassSurface, glassShadow } from '@/components/glass/GlassSurface';
import { RoutePath } from '@/components/RoutePath';
import { SpotifyPlayerCard } from '@/components/spotify/SpotifyPlayerCard';
import { useNowPlaying } from '@/hooks/useSpotifyPlayer';
import { useRunTracker } from '@/hooks/useRunTracker';
import { useSaveRun } from '@/hooks/useRuns';
import { radius, spacing, useTheme } from '@/theme';
import { friendlyError } from '@/utils/errors';
import { formatDistance, formatDuration, formatPace } from '@/utils/geo';
// Tela cheia (sem abas), porque a corrida precisa da atenção do usuário: o
// mapa e os números ocupam o centro, e Pausar/Retomar/Finalizar ficam sempre
// visíveis, em vidro, por cima do traçado.
export default function ActiveRunScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const tracker = useRunTracker();
  const saveRun = useSaveRun();
  const { data: nowPlaying } = useNowPlaying();
  const [starting, setStarting] = useState(false);
  const [pendingRun, setPendingRun] = useState<ReturnType<typeof tracker.finish>>(null);
  function leaveRun() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }
  async function handleStart() {
    setStarting(true);
    let ok: boolean;
    try {
      ok = await tracker.start();
    } catch (error) {
      Alert.alert('GPS indisponível', friendlyError(error));
      return;
    } finally {
      setStarting(false);
    }
    if (!ok) {
      Alert.alert(
        'Permissão de localização necessária',
        'O RotaFit precisa da sua localização para registrar a rota da corrida. ' +
          'Ative a permissão nas configurações do aparelho.',
      );
    }
  }
  function handleFinish() {
    Alert.alert('Finalizar corrida', 'Deseja encerrar e salvar esta corrida?', [
      { text: 'Continuar correndo', style: 'cancel' },
      {
        text: 'Finalizar',
        style: 'destructive',
        onPress: () => {
          const input = tracker.finish(
            nowPlaying?.name ? `${nowPlaying.name} — ${nowPlaying.artist}` : null,
          );
          if (!input || input.distanceMeters === 0) {
            Alert.alert('Corrida sem distância', 'O GPS precisa registrar algum deslocamento para salvar a corrida.', [
              { text: 'OK', onPress: leaveRun },
            ]);
            return;
          }
          setPendingRun(input);
          save(input);
        },
      },
    ]);
  }
  function save(input: NonNullable<typeof pendingRun>) {
    saveRun.mutate(input, {
      onSuccess: (id) => router.replace(`/run/${id}`),
      onError: (e) => Alert.alert('Não foi possível salvar', friendlyError(e)),
    });
  }
  function handleDiscard() {
    Alert.alert('Descartar corrida', 'Os dados desta corrida serão perdidos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          tracker.reset();
          leaveRun();
        },
      },
    ]);
  }
  if (pendingRun) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.readyTitle, { color: theme.text }]}>Corrida finalizada</Text>
        <Button
          title={saveRun.isPending ? 'Salvando...' : 'Salvar corrida'}
          disabled={saveRun.isPending}
          onPress={() => save(pendingRun)}
        />
        {saveRun.isPending ? null : (
          <Button title="Descartar" variant="ghost" onPress={handleDiscard} />
        )}
      </View>
    );
  }
  if (tracker.status === 'idle') {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="walk" size={64} color={theme.primary} />
        <Text style={[styles.readyTitle, { color: theme.text }]}>
          Pronto para começar?
        </Text>
        <Text style={[styles.readyText, { color: theme.muted }]}>
          Vamos usar sua localização para acompanhar a rota, a distância e o ritmo em
          tempo real.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleStart}
          disabled={starting}
          style={styles.startWrap}
        >
          <GlassSurface
            tint={theme.primary}
            radius={radius.pill}
            style={[styles.startBtn, glassShadow(theme.primary)]}
            intensity={0}
            opacity={1}
          >
            <Text style={[styles.startText, { color: theme.onPrimary }]}>
              {starting ? 'Localizando...' : 'Começar corrida'}
            </Text>
          </GlassSurface>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={leaveRun}>
          <Text style={[styles.cancel, { color: theme.muted }]}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.liveContent}>
        <View style={styles.liveHeader}>
          <Text
            accessibilityRole="header"
            style={[styles.liveTitle, { color: theme.text }]}
          >
            Corrida
          </Text>
          <Text
            style={[
              styles.liveBadge,
              { color: theme.primary, backgroundColor: theme.primarySoft },
            ]}
          >
            {tracker.status === 'active' ? 'Em andamento' : 'Em pausa'}
          </Text>
        </View>
        <RoutePath route={tracker.route} height={235} live />
        {tracker.status === 'active' && tracker.route.length === 0 ? (
          <Text style={{ color: theme.muted, textAlign: 'center' }}>
            {tracker.weakSignal
              ? 'O celular encontrou uma posição aproximada. Vá para uma área aberta para melhorar o sinal.'
              : tracker.elapsedSeconds >= 25
                ? 'Nenhuma posição recebida. Confira a localização exata nas permissões do RotaFit e teste a sua posição no Maps.'
                : 'Buscando sinal de GPS. Mantenha o RotaFit aberto em uma área aberta.'}
          </Text>
        ) : null}
        <View style={styles.stats}>
          <GlassSurface radius={radius.lg} style={styles.statsCard} intensity={30}>
            <Stat label="Distância" value={formatDistance(tracker.distanceMeters)} big />
            <View style={styles.statsRow}>
              <Stat label="Tempo" value={formatDuration(tracker.elapsedSeconds)} />
              <Stat label="Ritmo" value={formatPace(tracker.pace)} />
            </View>
          </GlassSurface>
          <SpotifyPlayerCard />
          <View style={styles.controls}>
            {tracker.status === 'active' ? (
              <ControlButton
                icon="pause"
                label="Pausar"
                onPress={tracker.pause}
                tint={theme.primary}
              />
            ) : (
              <ControlButton
                icon="play"
                label="Retomar"
                onPress={() =>
                  void tracker
                    .resume()
                    .catch((error) =>
                      Alert.alert('GPS indisponível', friendlyError(error)),
                    )
                }
                tint={theme.primary}
              />
            )}
            <ControlButton
              icon="stop"
              label="Finalizar"
              onPress={handleFinish}
              tint={theme.danger}
            />
          </View>
          <Pressable accessibilityRole="button" onPress={handleDiscard}>
            <Text style={[styles.discard, { color: theme.muted }]}>
              Descartar corrida
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[big ? styles.statBig : styles.statValue, { color: theme.text }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}
function ControlButton({
  icon,
  label,
  onPress,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tint: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.controlWrap}
    >
      <GlassSurface
        tint={tint}
        radius={radius.pill}
        style={[styles.controlBtn, glassShadow(tint)]}
        intensity={0}
        opacity={1}
      >
        <Ionicons name={icon} size={28} color={theme.onPrimary} />
      </GlassSurface>
      <Text style={[styles.controlLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  readyTitle: {
    fontSize: 31,
    letterSpacing: -0.9,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  readyText: { fontSize: 15, textAlign: 'center' },
  startWrap: { marginTop: spacing.lg, alignSelf: 'stretch' },
  startBtn: { minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  startText: { fontSize: 17, fontWeight: '800' },
  cancel: { marginTop: spacing.md, fontSize: 15 },
  screen: { flex: 1 },
  liveContent: {
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    padding: 18,
    gap: 14,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 3,
  },
  liveTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.9 },
  liveBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stats: { gap: spacing.md },
  statsCard: { padding: spacing.lg, gap: spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statBig: {
    fontSize: 49,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    textAlign: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  controlWrap: { alignItems: 'center', gap: 6 },
  controlBtn: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  controlLabel: { fontSize: 13, fontWeight: '600' },
  discard: { textAlign: 'center', marginTop: spacing.sm, fontSize: 14 },
});
