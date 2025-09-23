import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_WIDGET_PREFS,
  WidgetId,
  WidgetPref,
} from '../constants/widgets';

const KEY_GLOBAL = 'dashboard_prefs_global_v1';

// 팀별 커스터마이징이 필요하면 KEY에 teamId를 섞어주면 됨
const keyFor = (teamId?: number | null) =>
  teamId ? `${KEY_GLOBAL}:${teamId}` : KEY_GLOBAL;

export async function loadWidgetPrefs(
  teamId?: number | null,
): Promise<WidgetPref[]> {
  const key = keyFor(teamId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return DEFAULT_WIDGET_PREFS;
  try {
    const arr: WidgetPref[] = JSON.parse(raw);
    // 방어코드: 혹시 빠진 항목 보정
    const byId = new Map(arr.map(a => [a.id, a]));
    const merged = DEFAULT_WIDGET_PREFS.map(d => byId.get(d.id) ?? d);
    return merged.sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_WIDGET_PREFS;
  }
}

export async function saveWidgetPrefs(
  prefs: WidgetPref[],
  teamId?: number | null,
) {
  const key = keyFor(teamId);
  await AsyncStorage.setItem(key, JSON.stringify(prefs));
}

export function reorder(
  prefs: WidgetPref[],
  fromIdx: number,
  toIdx: number,
): WidgetPref[] {
  const next = [...prefs];
  const [item] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, item);
  return next.map((w, i) => ({ ...w, order: (i + 1) * 10 }));
}

export function toggleVisible(prefs: WidgetPref[], id: WidgetId): WidgetPref[] {
  return prefs.map(w => (w.id === id ? { ...w, visible: !w.visible } : w));
}
