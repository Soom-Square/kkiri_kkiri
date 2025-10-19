// src/screens/ActivityScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';
import { loadWidgetPrefs } from '../utils/widgetPrefs';
import {
  WIDGET_COMPONENTS,
  WidgetPref,
  DEFAULT_WIDGET_PREFS,
} from '../constants/widgets';
import RingGraph from '../components/RingGraph';

type ActivityScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ActivityScreen'
>;

const TOP_EXTRA = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8;
const HEADER_H_SPACE = 20;
const ICON_TINT = '#101828';

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

type ActivityOption = {
  teamId: number;
  teamName: string;
  part: string;
};

type Todo = {
  todo_id: number;
  title: string;
  status: '미진행' | '진행중' | '완료';
  scope_start_date?: string;
  scope_end_date?: string;
  scope_type: '월간' | '주간' | '일일' | '전체';
  assigned_user_id?: number | null;
};

type Progress = { total: number; done: number; percent: number };
type TeamMeta = { team_id: number; created_at: string | null; due_date: string | null };

const PURPLE = '#7A5AF8';
const INPUT_BG = '#F2F4F7';
const TEXT_HINT = '#667085';
const TEXT_MAIN = '#101828';

// 보라 계열 팔레트 (안→밖: 주간, 월간, 전체, 일정)
const RING_COLORS = ['#A78BFA', '#8B5CF6', '#7C3AED', '#5B21B6'];
// 그래프 사이즈(더 작게)
const GRAPH_SIZE = 160;
const GRAPH_STROKE = 12;
const GRAPH_GAP = 6;

// fetchJson: body 한 번만 읽기
async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const msg = typeof data === 'object' && data ? (data.error || data.message) : text;
    throw new Error(`HTTP ${res.status}: ${msg || 'request failed'}`);
  }
  return data as T;
}

export default function ActivityScreen() {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const navigation = useNavigation<ActivityScreenNavigationProp>();

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ActivityOption[]>([]);
  const [selected, setSelected] = useState<ActivityOption | null>(null);
  const [loading, setLoading] = useState(false);

  const [progress, setProgress] = useState<Progress>({ total: 0, done: 0, percent: 0 });
  const [monthlyTodos, setMonthlyTodos] = useState<Todo[]>([]);
  const [weeklyTodos, setWeeklyTodos] = useState<Todo[]>([]);
  const [overallTodos, setOverallTodos] = useState<Todo[]>([]);
  const [teamMeta, setTeamMeta] = useState<TeamMeta | null>(null);

  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(DEFAULT_WIDGET_PREFS);

  const [issueRefreshKey, setIssueRefreshKey] = useState(0);

  // 그래프 접힘/펼침 상태 (기본 펼침)
  const [graphOpen, setGraphOpen] = useState(true);

  const API_BASE = useMemo(() => API_BASE_URL, []);

  // 날짜 유틸
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;

  const getMonthRange = (date = new Date()) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start: fmt(start), end: fmt(end) };
  };

  const getWeekRange = (date = new Date()) => {
    const day = (date.getDay() + 6) % 7; // Mon=0
    const start = new Date(date);
    start.setDate(date.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: fmt(start), end: fmt(end) };
  };

  const weekOfMonth = (date = new Date()) => {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstMonOffset = (first.getDay() + 6) % 7; // Mon=0
    const dayIdx = date.getDate() - 1;
    return Math.floor((firstMonOffset + dayIdx) / 7) + 1;
  };

  const monthLabel = () => {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(2);
    const mm = d.getMonth() + 1;
    return `< ${yy}.${mm}월 >`;
  };

  const weekLabel = () => {
    const d = new Date();
    const mm = d.getMonth() + 1;
    return `< ${mm}월 ${weekOfMonth(d)}주차 >`;
  };

  // API
  const fetchTeams = useCallback(async () => {
    if (!currentUserId) return [];
    return await fetchJson<ActivityOption[]>(`${API_BASE}/users/${currentUserId}/teams`);
  }, [API_BASE, currentUserId]);

  const fetchAllDataForTeam = useCallback(
    async (teamId: number) => {
      if (!currentUserId) return;
      const month = getMonthRange();
      const week = getWeekRange();
      const headers = { 'x-user-id': String(currentUserId) };

      setLoading(true);
      try {
        const meta = await fetchJson<TeamMeta>(`${API_BASE}/teams/${teamId}`, { headers });
        setTeamMeta(meta);

        const pData = await fetchJson<Progress>(
          `${API_BASE}/teams/${teamId}/progress?scope_type=%EC%9B%94%EA%B0%84&start=${month.start}&end=${month.end}`
        );
        setProgress(pData);

        const mJson = await fetchJson(`${API_BASE}/todos/${teamId}?scope_type=%EC%9B%94%EA%B0%84&start=${month.start}&end=${month.end}`, { headers });
        setMonthlyTodos(Array.isArray(mJson) ? mJson : []);

        const wJson = await fetchJson(`${API_BASE}/todos/${teamId}?scope_type=%EC%A3%BC%EA%B0%84&start=${week.start}&end=${week.end}`, { headers });
        setWeeklyTodos(Array.isArray(wJson) ? wJson : []);

        const oJson = await fetchJson(`${API_BASE}/teams/${teamId}/todos-all?scope_type=%EC%A0%84%EC%B2%B4`, { headers });
        setOverallTodos(Array.isArray(oJson) ? oJson : []);
      } catch (e) {
        console.warn('데이터 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    },
    [API_BASE, currentUserId],
  );

  // 초기 로드
  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      const data = await fetchTeams();
      setOptions(data);
      if (data.length > 0) setSelected(prev => prev ?? data[0]);
    })();
  }, [currentUserId, fetchTeams]);

  // 선택 변경 시 로드
  useEffect(() => {
    if (selected?.teamId) fetchAllDataForTeam(selected.teamId);
  }, [selected, fetchAllDataForTeam]);

  // 복귀 시 새로고침
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const reload = async () => {
        const data = await fetchTeams();
        if (!alive) return;
        setOptions(data);
        const keep = data.find(d => d.teamId === selected?.teamId);
        const nextSelected = keep ?? data[0] ?? null;
        setSelected(nextSelected || null);
        if (nextSelected) await fetchAllDataForTeam(nextSelected.teamId);
      };
      reload();
      setIssueRefreshKey(k => k + 1);
      return () => { alive = false; };
    }, [fetchTeams, fetchAllDataForTeam, selected?.teamId]),
  );

  // 위젯 설정 로드
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const prefs = await loadWidgetPrefs(selected?.teamId ?? null);
        if (alive) setWidgetPrefs(prefs);
      })();
      return () => { alive = false; };
    }, [selected?.teamId]),
  );

  // 계산
  const doneCount = (arr: unknown) =>
    Array.isArray(arr) ? arr.filter((t: any) => t?.status === '완료').length : 0;
  const pct = (done: number, total: number) =>
    total > 0 ? Math.round((done / total) * 100) : 0;

  const monthlyPct = useMemo(() => pct(doneCount(monthlyTodos), monthlyTodos.length), [monthlyTodos]);
  const weeklyPct  = useMemo(() => pct(doneCount(weeklyTodos),  weeklyTodos.length),  [weeklyTodos]);
  const overallPct = useMemo(() => pct(doneCount(overallTodos), overallTodos.length), [overallTodos]);

  const schedulePct = useMemo(() => {
    if (!teamMeta?.created_at || !teamMeta?.due_date) return 0;
    const start = new Date(teamMeta.created_at).getTime();
    const end   = new Date(teamMeta.due_date).getTime();
    const now   = Date.now();
    if (end <= start) return 100;
    const clamped = Math.max(start, Math.min(now, end));
    return Math.round(((clamped - start) / (end - start)) * 100);
  }, [teamMeta]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" />

      {/* 상단 공통 헤더 */}
      <View style={[styles.header, { paddingTop: TOP_EXTRA }]}>
        <Text style={styles.logo}>끼리끼리</Text>
        <View style={styles.iconRow}>
          <Pressable hitSlop={10} onPress={() => navigation.navigate('PortfolioListScreen')}>
            <Image source={require('../assets/folder.png')} style={styles.headerIcon} resizeMode="contain" />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => navigation.navigate('ActivitySettingScreen', { teamId: selected?.teamId ?? undefined })}>
            <Image source={require('../assets/settings-01.png')} style={[styles.headerIcon, { marginLeft: 16 }]} resizeMode="contain" />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => navigation.navigate('Notifications')}>
            <Image source={require('../assets/bell.png')} style={[styles.headerIcon, { marginLeft: 16 }]} resizeMode="contain" />
          </Pressable>
        </View>
      </View>

      <View style={[styles.container, { paddingTop: 0 }]}>
        {/* 드롭다운 + 역할 */}
        <View style={styles.selectRow}>
          <View style={styles.dropdown}>
            <Pressable style={styles.dropdownBtn} onPress={() => setOpen(v => !v)}>
              <Text style={styles.dropdownText}>
                {selected ? selected.teamName : '내 활동 선택'}
              </Text>
              <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
            </Pressable>

            {open && (
              <View style={styles.dropdownList}>
                <FlatList
                  data={options}
                  keyExtractor={(item) => String(item.teamId)}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => {
                        setSelected(item);
                        setOpen(false);
                      }}
                      style={({ pressed }) => [styles.dropdownItem, pressed && { opacity: 0.6 }]}
                    >
                      <Text style={styles.dropdownItemText}>{item.teamName}</Text>
                    </Pressable>
                  )}
                />
              </View>
            )}
          </View>

          <Text style={styles.partText}>{selected?.part ? humanizePart(selected.part) : '—'}</Text>
        </View>

        {/* 본문 */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          {/* 헤더 + 토글 버튼 */}
          <View style={{ marginTop: 24 }}>
            <View style={styles.progressHeader}>
              <View style={styles.progressTitleRow}>
                <Text style={styles.progressTitle}>이번 달 {monthlyPct}% 완료!</Text>
                <Pressable hitSlop={10} onPress={() => setGraphOpen(v => !v)} style={styles.foldBtn}>
                  <Image
                    source={require('../assets/Vector2.png')}
                    style={[styles.foldIcon, !graphOpen && { transform: [{ rotate: '180deg' }] }]}
                    resizeMode="contain"
                  />
                </Pressable>
              </View>
            </View>

            {/* 링그래프 + 라벨: 접힘/펼침 */}
            {graphOpen && (
              <View style={styles.ringRow}>
                <RingGraph
                  size={GRAPH_SIZE}
                  stroke={GRAPH_STROKE}
                  gap={GRAPH_GAP}
                  rings={[
                    { percent: weeklyPct },   // 안쪽: 주간
                    { percent: monthlyPct },  // 월간
                    { percent: overallPct },  // 전체
                    { percent: schedulePct }, // 바깥: 일정
                  ]}
                  colors={RING_COLORS}
                />
                <View style={styles.ringLegend}>
                  <Text style={[styles.legendLine, { color: RING_COLORS[3] }]}>
                    일정 {schedulePct}% 진행중
                  </Text>
                  <Text style={[styles.legendLine, { color: RING_COLORS[2] }]}>
                    전체 {overallPct}% 완료
                  </Text>
                  <Text style={[styles.legendLine, { color: RING_COLORS[1] }]}>
                    월간 목표 {monthlyPct}% 완료
                  </Text>
                  <Text style={[styles.legendLine, { color: RING_COLORS[0] }]}>
                    주간 목표 {weeklyPct}% 완료
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 섹션들 */}
          <View style={{ marginTop: 20 }}>
            <Section title="월간 목표" sub={monthLabel()} data={monthlyTodos} />
          </View>

          <View style={{ marginTop: 24, paddingBottom: 120 }}>
            <Section title="주간 목표" sub={weekLabel()} data={weeklyTodos} />
          </View>

          <View style={styles.addBtnRow}>
          <Pressable
            onPress={() =>
              navigation.navigate('TodoScreen', { teamId: selected?.teamId ?? null })
            }
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
            hitSlop={8}
          >
            <Image
              source={require('../assets/plus-circle.png')}
              style={styles.addBtnIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>
          {/* 위젯 영역: 설정(가시성/순서)에 따라 렌더 */}
          <View style={{ marginTop: 12 }}>
            {widgetPrefs
              .filter(w => w.visible)
              .sort((a,b)=>a.order-b.order)
              .map(w => {
                const C = WIDGET_COMPONENTS[w.id];
                return (
                  <C
                    key={w.id}
                    teamId={selected?.teamId ?? null}
                    {...(w.id === 'issue' ? { refreshKey: issueRefreshKey } : {})}
                  />
                );
              })}
          </View>
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

function humanizePart(part: string) {
  if (!part) return '';
  return part;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20 },
  scrollBody: { paddingBottom: 80, backgroundColor: '#FFFFFF' },

  // 공통 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HEADER_H_SPACE,
    backgroundColor: '#FFFFFF',
  },
  logo: { fontSize: 20, fontWeight: '700', color: PURPLE },
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { width: 22, height: 22, tintColor: ICON_TINT },

  // 드롭다운
  selectRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdown: { flex: 1, marginRight: 12, position: 'relative' },
  dropdownBtn: { backgroundColor: INPUT_BG, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  dropdownText: { flex: 1, color: TEXT_MAIN, fontSize: 16, fontWeight: '700' },
  chevron: { marginLeft: 8, color: TEXT_HINT, fontSize: 12 },
  dropdownList: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB',
    maxHeight: 220, zIndex: 9999, elevation: 5
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemText: { fontSize: 15, color: TEXT_MAIN },
  partText: { marginLeft: 8, fontSize: 18, fontWeight: '800', color: '#1F2A37' },

  // 진행 헤더
  progressHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  progressTitleRow: { flexDirection: 'row', alignItems: 'center' },
  progressTitle: { fontSize: 26, fontWeight: '800', color: '#1F2A37' },
  progressCaption: { fontSize: 13, color: TEXT_HINT },

  // 접기 버튼
  foldBtn: { marginLeft: 8 },
  foldIcon: { width: 18, height: 18 },

  // 링그래프 + 레전드
  ringRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  ringLegend: { marginLeft: 38 },
  legendLine: { fontSize: 15, fontWeight: '600', marginVertical: 6 },

  // 섹션
  sectionRow: { flexDirection: 'row', alignItems: 'flex-start' },
  sectionLeft: { width: 112, paddingRight: 12 },
  sectionRight: { flex: 1 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  sectionSubUnder: { marginTop: 6, fontSize: 12, color: TEXT_HINT },

  emptyText: { color: TEXT_HINT },

  // 투두
  todoRow: { paddingVertical: 8 },
  todoText: { fontSize: 16, color: TEXT_MAIN, lineHeight: 24 },
  todoDone: { color: '#9CA3AF', textDecorationLine: 'line-through' },

  // 주간 목표 아래 우측 정렬 버튼 컨테이너
  addBtnRow: {
    marginTop: 12,
    marginBottom: 8,
    alignItems: 'center',  // 중앙 정렬
  },
  // 버튼 자체(그림만 쓰므로 컨테이너는 얇게)
  addBtn: {
    // 필요하면 터치 그림자 추가
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },

  // 아이콘 크기 살짝 감소
  addBtnIcon: {
    width: 40,   // 기존 56 -> 40 정도로 축소
    height: 40,
  },
});

function Section({ title, sub, data }: { title: string; sub: string; data: Todo[] }) {
  const loading = false;
  const stylesLocal = styles;
  const TodoItem = ({ item }: { item: Todo }) => {
    const isDone = item.status === '완료';
    return (
      <View style={stylesLocal.todoRow}>
        <Text style={[stylesLocal.todoText, isDone && stylesLocal.todoDone]} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    );
  };
  return (
    <View style={stylesLocal.sectionRow}>
      <View style={stylesLocal.sectionLeft}>
        <Text style={stylesLocal.sectionTitle}>{title}</Text>
        <Text style={stylesLocal.sectionSubUnder}>{sub}</Text>
      </View>
      <View style={stylesLocal.sectionRight}>
        {data.length === 0 ? (
          <Text style={stylesLocal.emptyText}>{loading ? '불러오는 중...' : '등록된 항목이 없어요'}</Text>
        ) : (
          <FlatList
            data={data}
            keyExtractor={t => String(t.todo_id)}
            renderItem={({ item }) => <TodoItem item={item} />}
            scrollEnabled={false}
          />
        )}
      </View>
    </View>
  );
}