import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SpotifyPlayerCard } from '@/components/spotify/SpotifyPlayerCard';
import { useAuth } from '@/context/AuthContext';
import { useWeeklyStats } from '@/hooks/useRuns';
import { useTheme } from '@/theme';
import { formatDistance, formatDuration } from '@/utils/geo';
import type { IconName } from '@/utils/icons';

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const stats = useWeeklyStats();
  const firstName = String(user?.user_metadata?.full_name ?? '')
    .trim()
    .split(' ')[0];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={stats.isRefetching}
            onRefresh={stats.refetch}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={[styles.brandIcon, { backgroundColor: theme.primary }]}>
            <Ionicons name="navigate" size={19} color={theme.onPrimary} />
          </View>
          <Text style={[styles.wordmark, { color: theme.text }]}>RotaFit</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil"
            onPress={() => router.push('/profile')}
            style={[
              styles.avatar,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            {firstName ? (
              <Text style={{ color: theme.primary, fontWeight: '800' }}>
                {firstName[0].toUpperCase()}
              </Text>
            ) : (
              <Ionicons name="person-outline" size={18} color={theme.text} />
            )}
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Image
            source={require('../../../assets/corrida-serra.jpg')}
            style={styles.heroImage}
            resizeMode="cover"
            accessible={false}
          />
          <LinearGradient
            colors={['rgba(12,15,17,0.05)', 'rgba(12,15,17,0.94)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text accessibilityRole="header" style={styles.heroTitle}>
              Sua próxima{'\n'}corrida
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/run/active')}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: theme.primary },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="play" size={17} color="#fff" />
              <Text style={styles.ctaText}>Iniciar corrida</Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#fff"
                style={styles.ctaArrow}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: theme.text }]}
          >
            Esta semana
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/history')}
            style={styles.historyLink}
          >
            <Text style={{ color: theme.primary, fontWeight: '700' }}>Histórico</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.primary} />
          </Pressable>
        </View>
        {stats.isError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void stats.refetch()}
            style={[
              styles.errorCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={{ color: theme.text }}>
              Não foi possível carregar as estatísticas.
            </Text>
            <Text style={{ color: theme.primary, fontWeight: '700' }}>
              Tentar novamente
            </Text>
          </Pressable>
        ) : (
          <View style={styles.metrics}>
            <Metric
              icon="navigate-outline"
              label="Distância"
              value={
                stats.isLoading
                  ? '—'
                  : formatDistance(stats.data?.totalDistanceMeters ?? 0)
              }
            />
            <Metric
              icon="time-outline"
              label="Tempo"
              value={
                stats.isLoading
                  ? '—'
                  : formatDuration(stats.data?.totalDurationSeconds ?? 0)
              }
            />
            <Metric
              icon="footsteps-outline"
              label="Corridas"
              value={stats.isLoading ? '—' : String(stats.data?.runCount ?? 0)}
            />
          </View>
        )}

        <SpotifyPlayerCard />
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.metric,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={[styles.metricIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={16} color={theme.primary} />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.metricValue, { color: theme.text }]}
      >
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 105,
    gap: 15,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 3 },
  brandIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { flex: 1, fontSize: 25, fontWeight: '900', letterSpacing: -1.2 },
  avatar: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    minHeight: 270,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#171B1A',
    justifyContent: 'flex-end',
  },
  heroImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  heroContent: { padding: 19, gap: 15 },
  heroTitle: {
    fontSize: 44,
    lineHeight: 43,
    letterSpacing: -2.1,
    fontWeight: '900',
    color: '#fff',
  },
  cta: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  ctaArrow: { marginLeft: 'auto' },
  pressed: { opacity: 0.78 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  sectionTitle: { fontSize: 23, letterSpacing: -0.7, fontWeight: '800' },
  historyLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 9,
    gap: 4,
  },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, minWidth: 0, borderRadius: 17, borderWidth: 1, padding: 10, gap: 5 },
  metricIcon: {
    width: 29,
    height: 29,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  metricLabel: { fontSize: 12, fontWeight: '600' },
  errorCard: { padding: 16, gap: 8, borderWidth: 1, borderRadius: 17 },
});
