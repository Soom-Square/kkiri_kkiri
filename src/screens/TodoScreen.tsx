// src/screens/TodoScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

// 색상
const PURPLE = '#7A5AF8';
const LILAC = '#EFEAFF';
const INPUT_BG = '#F2F4F7';
const TEXT_MAIN = '#101828';
const TEXT_HINT = '#667085';

// 타입
type Scope = '월간' | '주간' | '일일';

type Todo = {
  todo_id: number;
  title: string;
  status: '미진행' | '진행중' | '완료';
  scope_type: Scope;
  scope_start_date: string;
  scope_end_date: string;
};

type Team = {
  team_id: number;
  team_name: string;
  role: string;
};

type Period = { start: string; end: string; label: string };

// 날짜 유틸
const fmt2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const ymd = (d: Date) =>
  `${d.getFullYear()}-${fmt2(d.getMonth() + 1)}-${fmt2(d.getDate())}`;

const weekRangeFrom = (anchor: Date) => {
  const day = anchor.getDay(); // 일0 월1 ...
  const diffToMon = (day + 6) % 7; // 월0
  const s = new Date(anchor);
  s.setDate(anchor.getDate() - diffToMon);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return { s, e };
};

const monthRangeFrom = (anchor: Date) => {
  const s = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const e = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { s, e };
};

const periodOf = (scope: Scope, anchor: Date): Period => {
  if (scope === '일일') {
    const s = ymd(anchor);
    return { start: s, end: s, label: `${anchor.getMonth() + 1}월 ${anchor.getDate()}일` };
  }
  if (scope === '주간') {
    const { s, e } = weekRangeFrom(anchor);
    return {
      start: ymd(s),
      end: ymd(e),
      label: weekLabelByMonth(s),
    };
  }
  const { s, e } = monthRangeFrom(anchor);
  return {
    start: ymd(s),
    end: ymd(e),
    label: `${s.getFullYear()}년 ${s.getMonth() + 1}월`,
  };
};

// 주차 라벨 (UI 전용)
const koreanWeekOrdinal = (n: number) =>
  ['첫째','둘째','셋째','넷째','다섯째','여섯째'][n - 1] ?? `${n}째`;

// 전달의 마지막 주 처리 규칙 포함
const weekLabelByMonth = (weekStart: Date) => {
  const y = weekStart.getFullYear();
  const m = weekStart.getMonth(); // 0~11
  const firstDay = new Date(y, m, 1);
  const dow = firstDay.getDay(); // 0=일,1=월,...

  let firstWeekStart: Date;

  // 1일이 월~목
  if (dow >= 1 && dow <= 4) {
    // 1일이 속한 주가 첫째주
    firstWeekStart = new Date(firstDay);
    firstWeekStart.setDate(firstDay.getDate() - (dow - 1)); // 그 주 월요일
  } else {
    // 1일이 금~일 → 첫째주는 그 다음주
    firstWeekStart = new Date(firstDay);
    firstWeekStart.setDate(firstDay.getDate() + (8 - dow)); // 다음주 월요일
  }

  // 현재 주차 계산
  const n = Math.floor((+weekStart - +firstWeekStart) / (7 * 24 * 3600 * 1000)) + 1;
  return `${m + 1}월 ${koreanWeekOrdinal(n)}주`;
};

export default function TodoScreen() {
  const { user } = useAuth();
  const authHeader = user ? { 'x-user-id': String(user.id) } : undefined;

  // 팀 선택
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<Team | null>(null);
  const [open, setOpen] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // 기간 네비게이션
  const [viewDate, setViewDate] = useState<Record<Scope, Date>>({
    월간: new Date(),
    주간: new Date(),
    일일: new Date(),
  });

  // 섹션별 목록
  const [rangeTodos, setRangeTodos] = useState<Record<Scope, Todo[]>>({
    월간: [],
    주간: [],
    일일: [],
  });
  const [loadingByScope, setLoadingByScope] = useState<Record<Scope, boolean>>({
    월간: false,
    주간: false,
    일일: false,
  });

  // 편집/추가 입력
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [draftFor, setDraftFor] = useState<Scope | null>(null);
  const [draftText, setDraftText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // 팀 목록 로딩
  useEffect(() => {
    if (!user) return;
    setLoadingTeams(true);
    axios
      .get<Team[]>(`${API_BASE_URL}/my-teams`, { headers: authHeader })
      .then((res) => {
        const data = res.data ?? [];
        setTeams(data);
        if (data.length) setSelected(data[0]);
      })
      .catch((err) => console.error('팀 목록 불러오기 실패:', err))
      .finally(() => setLoadingTeams(false));
  }, [user]);

  // 기간별 데이터 로딩
  const fetchRange = async (scope: Scope) => {
    if (!user || !selected) return;
    const p = periodOf(scope, viewDate[scope]);
    try {
      setLoadingByScope((s) => ({ ...s, [scope]: true }));
      const { data } = await axios.get<Todo[]>(
        `${API_BASE_URL}/todos/${selected.team_id}`,
        {
          headers: authHeader,
          params: { scope_type: scope, start: p.start, end: p.end },
        }
      );
      setRangeTodos((prev) => ({ ...prev, [scope]: data ?? [] }));
    } catch (e) {
      console.error('기간별 투두 불러오기 실패:', e);
    } finally {
      setLoadingByScope((s) => ({ ...s, [scope]: false }));
    }
  };

  // 팀이 바뀌면 전 섹션 로딩
  useEffect(() => {
    if (!user || !selected) return;
    (['월간', '주간', '일일'] as Scope[]).forEach(fetchRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selected]);

  // 각 섹션 기준일 바뀔 때 해당 섹션만 로딩
  useEffect(() => { fetchRange('월간'); /* eslint-disable-line */ }, [viewDate['월간']]);
  useEffect(() => { fetchRange('주간'); /* eslint-disable-line */ }, [viewDate['주간']]);
  useEffect(() => { fetchRange('일일'); /* eslint-disable-line */ }, [viewDate['일일']]);

  // 상태 순환
  const nextStatus = (s: Todo['status']): Todo['status'] =>
    s === '미진행' ? '진행중' : s === '진행중' ? '완료' : '미진행';

  const cycleStatus = async (todo: Todo) => {
    const newStatus = nextStatus(todo.status);
    try {
      await axios.put(
        `${API_BASE_URL}/todos/${todo.todo_id}`,
        { status: newStatus },
        { headers: authHeader }
      );
      // 모든 섹션에서 동일 ID 업데이트
      setRangeTodos((prev) => {
        const updated: Record<Scope, Todo[]> = { ...prev };
        (Object.keys(prev) as Scope[]).forEach((k) => {
          updated[k] = prev[k].map((t) =>
            t.todo_id === todo.todo_id ? { ...t, status: newStatus } : t
          );
        });
        return updated;
      });
    } catch (e) {
      console.error('상태 변경 실패:', e);
    }
  };

  // 편집 진입/저장
  const startEdit = (todo: Todo) => {
    setEditingId(todo.todo_id);
    setEditingText(todo.title);
  };

  const saveEdit = async (todo: Todo) => {
    const text = editingText.trim();
    try {
      if (text === '') {
        // 삭제
        await axios.delete(`${API_BASE_URL}/todos/${todo.todo_id}`, { headers: authHeader });
        setRangeTodos((prev) => {
          const updated: Record<Scope, Todo[]> = { ...prev };
          (Object.keys(prev) as Scope[]).forEach((k) => {
            updated[k] = prev[k].filter((t) => t.todo_id !== todo.todo_id);
          });
          return updated;
        });
      } else {
        await axios.put(
          `${API_BASE_URL}/todos/${todo.todo_id}`,
          { title: text },
          { headers: authHeader }
        );
        setRangeTodos((prev) => {
          const updated: Record<Scope, Todo[]> = { ...prev };
          (Object.keys(prev) as Scope[]).forEach((k) => {
            updated[k] = prev[k].map((t) =>
              t.todo_id === todo.todo_id ? { ...t, title: text } : t
            );
          });
          return updated;
        });
      }
    } catch (e) {
      console.error('편집/삭제 실패:', e);
    } finally {
      setEditingId(null);
      setEditingText('');
    }
  };

  // 체크박스
  const renderCheckbox = (status: Todo['status']) => {
    const isDone = status === '완료';
    return (
      <View style={[styles.checkboxBase, isDone && styles.checkboxChecked]}>
        {isDone && <Text style={styles.checkMark}>✓</Text>}
      </View>
    );
  };

  // 추가 버튼
  const onPressAdd = (scope: Scope) => {
    setDraftFor(scope);
    setDraftText('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // 새 항목 저장
  const submitDraft = async () => {
    if (!draftFor || !draftText.trim() || !selected || !user) {
      setDraftFor(null);
      setDraftText('');
      return;
    }
    try {
      const p = periodOf(draftFor, viewDate[draftFor]); // 현재 보이는 기간으로 저장
      const payload = {
        team_id: selected.team_id,
        title: draftText.trim(),
        scope_type: draftFor,
        scope_start_date: p.start,
        scope_end_date: p.end,
      };
      const { data: created } = await axios.post<Todo>(
        `${API_BASE_URL}/todos`,
        payload,
        { headers: authHeader }
      );
      setRangeTodos((prev) => ({ ...prev, [draftFor]: [created, ...prev[draftFor]] }));
    } catch (e) {
      console.error('새 todo 생성 실패:', e);
    } finally {
      setDraftFor(null);
      setDraftText('');
    }
  };

  // 행 렌더
  const renderRow = (todo: Todo) => {
    const isEditing = editingId === todo.todo_id;
    const isDone = todo.status === '완료';
    const isDoing = todo.status === '진행중';

    return (
      <View key={todo.todo_id} style={styles.row}>
        <Pressable onPress={() => cycleStatus(todo)}>
          {renderCheckbox(todo.status)}
        </Pressable>

        <View style={{ width: 8 }} />

        {isEditing ? (
          <TextInput
            value={editingText}
            onChangeText={setEditingText}
            placeholder="내용을 입력하세요"
            placeholderTextColor="#B3B8C3"
            style={[styles.todoText, styles.input]}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => saveEdit(todo)}
            onBlur={() => saveEdit(todo)}
          />
        ) : (
          <Pressable style={[isDoing && styles.pill]} onPress={() => startEdit(todo)}>
            <Text
              style={[
                styles.todoText,
                isDone && { textDecorationLine: 'line-through', color: '#9AA0A6' },
              ]}
              numberOfLines={2}
            >
              {todo.title}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  // 입력행 렌더
  const renderDraftRow = (scope: Scope) => {
    if (draftFor !== scope) return null;
    return (
      <View style={styles.row}>
        {renderCheckbox('미진행')}
        <View style={{ width: 8 }} />
        <TextInput
          ref={inputRef}
          value={draftText}
          onChangeText={setDraftText}
          placeholder="새 목표 입력"
          placeholderTextColor="#B3B8C3"
          style={[styles.todoText, styles.input]}
          returnKeyType="done"
          onSubmitEditing={submitDraft}
          //onBlur={submitDraft}
        />
      </View>
    );
  };

  // 기간 이동
  const shiftAnchor = (scope: Scope, dir: 1 | -1) => {
    setViewDate((prev) => {
      const cur = new Date(prev[scope]);
      if (scope === '일일') cur.setDate(cur.getDate() + dir);
      else if (scope === '주간') cur.setDate(cur.getDate() + dir * 7);
      else cur.setMonth(cur.getMonth() + dir);
      return { ...prev, [scope]: cur };
    });
  };

  // 섹션 렌더
  const renderSection = (scope: Scope) => {
    const p = periodOf(scope, viewDate[scope]);
    const list = rangeTodos[scope];
    const loading = loadingByScope[scope];

    return (
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
          <Text style={styles.sectionTitle}>{scope} 목표</Text>

          <View style={styles.periodNav}>
            <TouchableOpacity onPress={() => shiftAnchor(scope, -1)} style={styles.navBtn}>
              <Text style={styles.navBtnText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.periodLabel}>{p.label}</Text>
            <TouchableOpacity onPress={() => shiftAnchor(scope, 1)} style={styles.navBtn}>
              <Text style={styles.navBtnText}>{'>'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderDraftRow(scope)}

        {loading ? (
          <ActivityIndicator />
        ) : list.length === 0 && draftFor !== scope ? (
          <Text style={styles.emptyText}>등록된 할 일이 없어요</Text>
        ) : (
          list.map(renderRow)
        )}

        <Pressable style={styles.addButton} onPress={() => onPressAdd(scope)}>
          <Image
            source={require('../assets/plus-circle.png')}
            style={{ width: 28, height: 28 }}
            resizeMode="contain"
          />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#FFFFFF' }}>
      {/* 상단 드롭다운 + 역할 */}
      <View style={styles.selectRow}>
        <View style={styles.dropdown}>
          <Pressable style={styles.dropdownBtn} onPress={() => setOpen((v) => !v)}>
            <Text style={styles.dropdownText}>
              {selected ? selected.team_name : loadingTeams ? '불러오는 중...' : '내 팀 선택'}
            </Text>
            <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
          </Pressable>

          {open && (
            <View style={styles.dropdownList}>
              <FlatList
                data={teams}
                keyExtractor={(item) => String(item.team_id)}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setSelected(item);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [styles.dropdownItem, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.dropdownItemText}>{item.team_name}</Text>
                  </Pressable>
                )}
              />
            </View>
          )}
        </View>

        <Text style={styles.roleText}>{selected?.role ?? '—'}</Text>
      </View>

      <FlatList
        data={['월간', '주간', '일일'] as Scope[]}
        keyExtractor={(item) => item}
        renderItem={({ item }) => renderSection(item)}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  selectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dropdown: { flex: 1, marginRight: 12 },
  dropdownBtn: {
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: { flex: 1, color: TEXT_MAIN, fontSize: 16, fontWeight: '700' },
  chevron: { marginLeft: 8, color: TEXT_HINT, fontSize: 12 },
  dropdownList: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    maxHeight: 220,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemText: { fontSize: 15, color: TEXT_MAIN },
  roleText: { fontSize: 16, fontWeight: '700', color: '#1F2A37' },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#999', paddingVertical: 6 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  checkboxBase: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#C7C9D1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: { backgroundColor: PURPLE, borderColor: PURPLE },
  checkMark: { color: '#FFFFFF', fontSize: 14, lineHeight: 16, fontWeight: '800' },

  pill: { backgroundColor: LILAC, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10 },
  todoText: { fontSize: 16, color: TEXT_MAIN },

  input: { flex: 1, paddingVertical: 4 },

  addButton: { marginTop: 8, alignItems: 'center' },

  periodNav: { flexDirection: 'row', alignItems: 'center' },
  periodLabel: { fontSize: 15, color: '#111827', paddingHorizontal: 8 },
  navBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F3F4F6' },
  navBtnText: { fontSize: 14, color: '#374151', fontWeight: '700' },
});