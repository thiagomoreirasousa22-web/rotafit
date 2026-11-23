import * as Location from 'expo-location';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { averagePaceSecPerKm, simplifyRoute } from '@/utils/geo';
import { elapsedSeconds, initialTrackerState, trackerReducer } from '@/utils/tracker';
import type { SaveRunInput } from '@/types';
// Liga o reducer puro (utils/tracker.ts) ao GPS de verdade e a um relógio de
// 1 em 1 segundo. A lógica de "o que fazer com cada evento" já está testada
// no reducer; aqui só existe o encanamento com o sensor do aparelho.
export function useRunTracker() {
  const [state, dispatch] = useReducer(trackerReducer, initialTrackerState);
  const [now, setNow] = useState(() => Date.now());
  const [weakSignal, setWeakSignal] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const watchGeneration = useRef(0);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  useEffect(() => {
    if (state.status !== 'active') return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.status]);
  const stopWatching = useCallback(() => {
    watchGeneration.current += 1;
    subscription.current?.remove();
    subscription.current = null;
  }, []);
  useEffect(() => stopWatching, [stopWatching]);
  const startWatching = useCallback(async (type: 'START' | 'RESUME') => {
    if (!(await Location.hasServicesEnabledAsync())) {
      throw new Error('Ative a Localização do celular e tente novamente.');
    }
    const generation = ++watchGeneration.current;
    setWeakSignal(false);
    let ready = false;
    let firstFix: Location.LocationObject | undefined;
    const addPoint = (loc: Location.LocationObject) => {
      dispatch({
        type: 'ADD_POINT',
        now: loc.timestamp,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
    };
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 0,
        mayShowUserSettingsDialog: false,
      },
      (loc) => {
        if (generation !== watchGeneration.current) return;
        if ((loc.coords.accuracy ?? 0) > 50) {
          setWeakSignal(true);
          return;
        }
        setWeakSignal(false);
        if (ready) addPoint(loc);
        else firstFix ??= loc;
      },
    );
    if (generation !== watchGeneration.current) {
      sub.remove();
      return false;
    }
    subscription.current = sub;
    const now = Date.now();
    setNow(now);
    dispatch({ type, now });
    ready = true;
    if (firstFix) addPoint(firstFix);
    return true;
  }, []);
  const start = useCallback(async () => {
    const { status, android } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermissionDenied(true);
      return false;
    }
    setPermissionDenied(false);
    if (android?.accuracy === 'coarse') {
      throw new Error('Nas permissões de localização do RotaFit, ative Usar localização exata.');
    }
    return startWatching('START');
  }, [startWatching]);
  const pause = useCallback(() => {
    stopWatching();
    dispatch({ type: 'PAUSE', now: Date.now() });
  }, [stopWatching]);
  const resume = useCallback(async () => {
    await startWatching('RESUME');
  }, [startWatching]);
  // Encerra a corrida e devolve os dados prontos para salvar no Supabase.
  const finish = useCallback(
    (spotifyTrackName: string | null): SaveRunInput | null => {
      stopWatching();
      const at = Date.now();
      dispatch({ type: 'FINISH', now: at });
      if (state.startedAt === null) return null;
      return {
        startedAt: new Date(state.startedAt).toISOString(),
        endedAt: new Date(at).toISOString(),
        distanceMeters: state.distanceMeters,
        durationSeconds: Math.round(
          elapsedSeconds(trackerReducer(state, { type: 'FINISH', now: at }), at),
        ),
        route: simplifyRoute(state.route),
        spotifyTrackName,
      };
    },
    [state, stopWatching],
  );
  const reset = useCallback(() => {
    stopWatching();
    dispatch({ type: 'RESET' });
  }, [stopWatching]);
  const seconds = elapsedSeconds(state, now);
  return {
    status: state.status,
    route: state.route,
    distanceMeters: state.distanceMeters,
    elapsedSeconds: seconds,
    pace: averagePaceSecPerKm(state.distanceMeters, seconds),
    weakSignal,
    permissionDenied,
    start,
    pause,
    resume,
    finish,
    reset,
  };
}
