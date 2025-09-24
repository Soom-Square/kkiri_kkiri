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
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';
import { loadWidgetPrefs } from '../utils/widgetPrefs';
import { WIDGET_COMPONENTS, WidgetPref, DEFAULT_WIDGET_PREFS, WidgetComponentProps } from '../constants/widgets';



const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type ActivityOption = {
  teamId: number;
  teamName: string;
  part: string;
};

const PURPLE = '#7A5AF8';
const INPUT_BG = '#F2F4F7';
const TEXT_HINT = '#667085';
const TEXT_MAIN = '#101828';

type Todo = {
  todo_id: number;
  title: string;
  status: '미진행' | '진행중' | '완료';
  scope_start_date: string;
  scope_end_date: string;
  scope_type: '월간' | '주간' | '일일';
};

type Progress = { total: number; done: number; percent: number };

export default function ActivityScreen() {
  const { user } = useAuth();
  const currentUserId = user?.id; // 필요 시 user.user_id
  const navigation = useNavigation<Nav>();

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ActivityOption[]>([]);
  const [selected, setSelected] = useState<ActivityOption | null>(null);

  const [progress, setProgress] = useState<Progress>({ total: 0, done: 0, percent: 0 });
  const [monthlyTodos, setMonthlyTodos] = useState<Todo[]>([]);
  const [weeklyTodos, setWeeklyTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = useMemo(() => API_BASE_URL, []);

  // 날짜 유틸
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const getMonthRange = (date = new Date()) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start: fmt(start), end: fmt(end) };
  };

  // 월요일 시작 기준
  const getWeekRange = (date = new Date()) => {
    const day = (date.getDay() + 6) % 7; // Mon=0
    const start = new Date(date);
    start.setDate(date.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: fmt(start), end: fmt(end), startDate: start };
  };

  // n주차 계산(월요일 시작)
  const weekOfMonth = (date = new Date()) => {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstMonOffset = (first.getDay() + 6) % 7; // Mon=0
    const dayIdx = date.getDate() - 1; // 0-based
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

  // ── API 호출 함수 ──────────────────────────────
  const fetchTeams = useCallback(async () => {
    if (!currentUserId) return [];
    const res = await fetch(`${API_BASE}/users/${currentUserId}/teams`);
    const data: ActivityOption[] = await res.json();
    return data;
  }, [API_BASE, currentUserId]);

  const fetchAllDataForTeam = useCallback(
    async (teamId: number) => {
      if (!currentUserId) return;
      const month = getMonthRange();
      const week = getWeekRange();
      const headers = { 'x-user-id': String(currentUserId) };

      setLoading(true);
      try {
        // 진행률(팀 월간)
        const pRes = await fetch(
          `${API_BASE}/teams/${teamId}/progress?scope_type=%EC%9B%94%EA%B0%84&start=${month.start}&end=${month.end}`
        );
        const pData: Progress = await pRes.json();
        setProgress(pData);

        // 내 월간
        const mRes = await fetch(
          `${API_BASE}/todos/${teamId}?scope_type=%EC%9B%94%EA%B0%84&start=${month.start}&end=${month.end}`,
          { headers }
        );
        setMonthlyTodos(await mRes.json());

        // 내 주간
        const wRes = await fetch(
          `${API_BASE}/todos/${teamId}?scope_type=%EC%A3%BC%EA%B0%84&start=${week.start}&end=${week.end}`,
          { headers }
        );
        setWeeklyTodos(await wRes.json());
      } catch (e) {
        console.warn('데이터 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    },
    [API_BASE, currentUserId]
  );
  // 컴포넌트 내부 상태
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(DEFAULT_WIDGET_PREFS);

  // 최초 팀 목록
  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      const data = await fetchTeams();
      setOptions(data);
      if (data.length > 0) setSelected((prev) => prev ?? data[0]);
    })();
  }, [currentUserId, fetchTeams]);

  // 선택된 팀 변경 시 데이터 로드
  useEffect(() => {
    if (selected?.teamId) fetchAllDataForTeam(selected.teamId);
  }, [selected, fetchAllDataForTeam]);

  // 화면에 다시 들어오면 전체 새로고침(팀 목록 + 섹션 데이터)
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const reload = async () => {
        const data = await fetchTeams();
        if (!alive) return;
        setOptions(data);
        const keep = data.find((d) => d.teamId === selected?.teamId);
        const nextSelected = keep ?? data[0] ?? null;
        setSelected(nextSelected || null);
        if (nextSelected) await fetchAllDataForTeam(nextSelected.teamId);
        else {
          setProgress({ total: 0, done: 0, percent: 0 });
          setMonthlyTodos([]);
          setWeeklyTodos([]);
        }
      };
      reload();
      return () => {
        alive = false;
      };
    }, [fetchTeams, fetchAllDataForTeam, selected?.teamId])
  );

  // 포커스 시 위젯 설정 로드(팀별 커스텀 쓰려면 selected?.teamId 넘겨줘)
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const prefs = await loadWidgetPrefs(selected?.teamId ?? null);
        if (alive) setWidgetPrefs(prefs);
      })();
      return () => { alive = false; };
    }, [selected?.teamId])
  );
  // 투두 행(불릿 없음)
  const TodoItem = ({ item }: { item: Todo }) => {
    const isDone = item.status === '완료';
    return (
      <View style={styles.todoRow}>
        <Text style={[styles.todoText, isDone && styles.todoDone]} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    );
  };

  // 공통 섹션(왼쪽: 제목+기간, 오른쪽: 투두 리스트)
  const Section = ({
    title,
    sub,
    data,
  }: {
    title: string;
    sub: string;
    data: Todo[];
  }) => (
    <View style={styles.sectionRow}>
      <View style={styles.sectionLeft}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubUnder}>{sub}</Text>
      </View>

      <View style={styles.sectionRight}>
        {data.length === 0 ? (
          <Text style={styles.emptyText}>{loading ? '불러오는 중...' : '등록된 항목이 없어요'}</Text>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(t) => String(t.todo_id)}
            renderItem={({ item }) => <TodoItem item={item} />}
            scrollEnabled={false}
          />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.container, { paddingTop: 12 ,}]}>
        {/* 상단 */}
        <View style={styles.topRow}>
          <Text style={styles.brand}>끼리끼리</Text>
          <View style={styles.iconRow}>
            <Pressable hitSlop={10} onPress={() => navigation.navigate('MyActivityScreen')}>
              <Image source={require('../assets/folder.png')} style={styles.icon} resizeMode="contain" />
            </Pressable>
            <Pressable hitSlop={10} onPress={() => navigation.navigate('ActivitySettingScreen', {teamId: selected?.teamId ?? undefined,})}>
              <Image source={require('../assets/settings-01.png')} style={[styles.icon, { marginLeft: 16 }]} resizeMode="contain" />
            </Pressable>
            <Pressable hitSlop={10} onPress={() => navigation.navigate('NotificationScreen')}>
              <Image source={require('../assets/bell.png')} style={[styles.icon, { marginLeft: 16 }]} resizeMode="contain" />
            </Pressable>
          </View>
        </View>

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
        {/* 스크롤 컨테이너 */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}  // 패딩/여유공간은 여기서
        keyboardShouldPersistTaps="handled"
      >
        {/* 진행률 */}
        <View style={{ marginTop: 24 }}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>이번 달 {progress.percent}% 완료!</Text>
            <Text style={styles.progressCaption}>이번달</Text>
          </View>
          <View style={styles.progressBarWrap}>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progress.percent}%` }]} />
            </View>
            <Text style={styles.progressMeta}>완료 {progress.done} / 전체 {progress.total}</Text>
          </View>
        </View>

        {/* 섹션들: 왼쪽 타이틀+기간, 오른쪽 리스트 */}
        <View style={{ marginTop: 20 }}>
          <Section title="월간 목표" sub={monthLabel()} data={monthlyTodos} />
        </View>

        <View style={{ marginTop: 24, paddingBottom: 120 }}>
          <Section title="주간 목표" sub={weekLabel()} data={weeklyTodos} />
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
                        teamId={selected?.teamId ?? null}   // ← 팀 ID 내려줌
                    />
                  );
                })}
            </View>
          </ScrollView>

          {/* 떠 있는 FAB (스크롤과 독립) */}
          <Pressable style={styles.fab} onPress={() => navigation.navigate('TodoScreen')}>
            <Image source={require('../assets/plus-circle.png')} style={{ width: 56, height: 56 }} />
          </Pressable>
          </View>
        </SafeAreaView>
  );
}

function humanizePart(part: string) {
  if (!part) return '';
  return part;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  scrollBody: {
    paddingBottom: 140, // FAB와 겹치지 않도록 여유
    backgroundColor: '#FFFFFF',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: PURPLE,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 26,
    height: 26,
  },
  selectRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdown: {
    flex: 1,
    marginRight: 12,
    position: 'relative',
  },
  dropdownBtn: {
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    flex: 1,
    color: TEXT_MAIN,
    fontSize: 16,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 8,
    color: TEXT_HINT,
    fontSize: 12,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    maxHeight: 220,
    zIndex: 9999,
    elevation: 5,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    color: TEXT_MAIN,
  },
  partText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2A37',
  },

  // 진행률
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  progressTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2A37',
  },
  progressCaption: {
    fontSize: 13,
    color: TEXT_HINT,
  },
  progressBarWrap: {
    marginTop: 12,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E9E5FE',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: PURPLE,
  },
  progressMeta: {
    marginTop: 8,
    fontSize: 12,
    color: TEXT_HINT,
    textAlign: 'right',
  },

  // 섹션 레이아웃(좌: 제목+기간, 우: 리스트)
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sectionLeft: {
    width: 112, // 왼쪽 타이틀 고정폭 (디자인 기준 맞춤)
    paddingRight: 12,
  },
  sectionRight: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  sectionSubUnder: {
    marginTop: 6,
    fontSize: 12,
    color: TEXT_HINT,
  },

  emptyText: {
    color: TEXT_HINT,
  },

  // 투두(불릿 없음, 오른쪽 컬럼에만 표시)
  todoRow: {
    paddingVertical: 8,
  },
  todoText: {
    fontSize: 16,
    color: TEXT_MAIN,
    lineHeight: 24,
  },
  todoDone: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
});