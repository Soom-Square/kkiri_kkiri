// src/screens/TodoTeamScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const PURPLE = '#7A5AF8';
const LILAC = '#EFEAFF';
const INPUT_BG = '#F2F4F7';
const TEXT_MAIN = '#101828';
const TEXT_HINT = '#667085';

type Scope = '월간' | '주간' | '일일';

type Todo = {
  todo_id: number;
  title: string;
  status: '미진행' | '진행중' | '완료';
  scope_type: Scope;
  scope_start_date: string;
  scope_end_date: string;
};

type Member = {
  user_id: number;
  name: string;
  part: string | null;
};

// ---------- 날짜 유틸 ----------
const fmt2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const ymd = (d: Date) =>
  `${d.getFullYear()}-${fmt2(d.getMonth() + 1)}-${fmt2(d.getDate())}`;

const weekRangeFrom = (anchor: Date) => {
  const dow = (anchor.getDay() + 6) % 7; // 월=0
  const s = new Date(anchor);
  s.setDate(anchor.getDate() - dow);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return { s, e };
};
const monthRangeFrom = (anchor: Date) => {
  const s = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const e = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { s, e };
};
const koreanWeekOrdinal = (n: number) =>
  ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째'][n - 1] ?? `${n}째`;
const weekLabelByMonth = (weekStart: Date) => {
  const y = weekStart.getFullYear();
  const m = weekStart.getMonth();
  const first = new Date(y, m, 1);
  const fd = first.getDay();
  let firstWeekStart = new Date(first);
  if (fd >= 1 && fd <= 4) firstWeekStart.setDate(first.getDate() - (fd - 1));
  else firstWeekStart.setDate(first.getDate() + (8 - fd));
  const n =
    Math.floor((+weekStart - +firstWeekStart) / (7 * 24 * 3600 * 1000)) + 1;
  return `${m + 1}월 ${koreanWeekOrdinal(n)}주`;
};

const periodOf = (scope: Scope, anchor: Date) => {
  if (scope === '일일') {
    const s = ymd(anchor);
    return { start: s, end: s, label: `${anchor.getMonth() + 1}월 ${anchor.getDate()}일` };
  }
  if (scope === '주간') {
    const { s, e } = weekRangeFrom(anchor);
    return { start: ymd(s), end: ymd(e), label: weekLabelByMonth(s) };
  }
  const { s, e } = monthRangeFrom(anchor);
  return { start: ymd(s), end: ymd(e), label: `${s.getFullYear()}년 ${s.getMonth() + 1}월` };
};

export default function TodoTeamScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const authHeader = user ? { 'x-user-id': String(user.id) } : undefined;

  const teamId: number = route.params?.teamId;

  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [viewDate, setViewDate] = useState<Record<Scope, Date>>({
    월간: new Date(),
    주간: new Date(),
    일일: new Date(),
  });

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

  const [draftFor, setDraftFor] = useState<Scope | null>(null);
  const [draftText, setDraftText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // ---- 팀원 목록 가져오기 ----
  useEffect(() => {
    if (!user || !teamId) return;
    setLoadingMembers(true);
    // 백엔드에 아래 라우트가 있어야 합니다 (아래에 스니펫 제공)
    axios
      .get<Member[]>(`${API_BASE_URL}/teams/${teamId}/members`, { headers: authHeader })
      .then((res) => {
        const list = res.data ?? [];
        setMembers(list);
        if (list.length) setSelected(list[0]);
      })
      .catch((e) => console.error('팀원 목록 실패:', e))
      .finally(() => setLoadingMembers(false));
  }, [user, teamId]);

  // ---- 선택된 팀원의 기간별 todo 조회 ----
  const fetchRange = async (scope: Scope) => {
    if (!user || !selected || !teamId) return;
    const p = periodOf(scope, viewDate[scope]);
    try {
      setLoadingByScope((s) => ({ ...s, [scope]: true }));
      // 팀원 todo 조회 라우트(아래 백엔드 스니펫 참고)
      const { data } = await axios.get<Todo[]>(
        `${API_BASE_URL}/teams/${teamId}/todos`,
        {
          headers: authHeader,
          params: {
            user_id: selected.user_id,
            scope_type: scope,
            start: p.start,
            end: p.end,
          },
        }
      );
      setRangeTodos((prev) => ({ ...prev, [scope]: data ?? [] }));
    } catch (e) {
      console.error('팀원 todo 조회 실패:', e);
    } finally {
      setLoadingByScope((s) => ({ ...s, [scope]: false }));
    }
  };

  useEffect(() => {
    if (!selected) return;
    (['월간', '주간', '일일'] as Scope[]).forEach(fetchRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => { fetchRange('월간'); /* eslint-disable-line */ }, [viewDate['월간']]);
  useEffect(() => { fetchRange('주간'); /* eslint-disable-line */ }, [viewDate['주간']]);
  useEffect(() => { fetchRange('일일'); /* eslint-disable-line */ }, [viewDate['일일']]);

  const nextStatus = (s: Todo['status']): Todo['status'] =>
    s === '미진행' ? '진행중' : s === '진행중' ? '완료' : '미진행';

  const cycleStatus = async (todo: Todo) => {
    // 조회/추가만 원하면 이 함수 전체를 주석 처리하세요.
    const newStatus = nextStatus(todo.status);
    try {
      await axios.put(
        `${API_BASE_URL}/todos/${todo.todo_id}`,
        { status: newStatus },
        { headers: authHeader }
      );
      setRangeTodos((prev) => {
        const u: Record<Scope, Todo[]> = { ...prev };
        (Object.keys(prev) as Scope[]).forEach((k) => {
          u[k] = prev[k].map((t) =>
            t.todo_id === todo.todo_id ? { ...t, status: newStatus } : t
          );
        });
        return u;
      });
    } catch (e) {
      console.error('상태 변경 실패:', e);
    }
  };

  const onPressAdd = (scope: Scope) => {
    setDraftFor(scope);
    setDraftText('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const isSavingRef = useRef(false);
  const submitDraft = async () => {
    if (!draftFor || !draftText.trim() || !selected) {
      setDraftFor(null);
      setDraftText('');
      return;
    }
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    try {
      const p = periodOf(draftFor, viewDate[draftFor]);
      // 팀원 todo 생성 라우트(아래 백엔드 스니펫 참고)
      const { data: created } = await axios.post<Todo>(
        `${API_BASE_URL}/teams/${teamId}/todos`,
        {
          assigned_user_id: selected.user_id,
          title: draftText.trim(),
          scope_type: draftFor,
          scope_start_date: p.start,
          scope_end_date: p.end,
        },
        { headers: authHeader }
      );
      setRangeTodos((prev) => ({ ...prev, [draftFor]: [created, ...prev[draftFor]] }));
    } catch (e) {
      console.error('팀원 todo 생성 실패:', e);
    } finally {
      setDraftFor(null);
      setDraftText('');
      isSavingRef.current = false;
    }
  };

  const shiftAnchor = (scope: Scope, dir: 1 | -1) => {
    setViewDate((prev) => {
      const cur = new Date(prev[scope]);
      if (scope === '일일') cur.setDate(cur.getDate() + dir);
      else if (scope === '주간') cur.setDate(cur.getDate() + dir * 7);
      else cur.setMonth(cur.getMonth() + dir);
      return { ...prev, [scope]: cur };
    });
  };

  const headerRightPart = useMemo(
    () => (selected?.part ? selected.part : '미정'),
    [selected?.part]
  );

  // ---------- UI ----------
  const renderCheckbox = (status: Todo['status']) => {
    const isDone = status === '완료';
    return (
      <View style={[styles.checkboxBase, isDone && styles.checkboxChecked]}>
        {isDone && <Text style={styles.checkMark}>✓</Text>}
      </View>
    );
  };

  const renderRow = (todo: Todo) => {
    const isDone = todo.status === '완료';
    const isDoing = todo.status === '진행중';
    return (
      <View key={todo.todo_id} style={styles.row}>
        <Pressable onPress={() => cycleStatus(todo)}>
          {renderCheckbox(todo.status)}
        </Pressable>
        <View style={{ width: 8 }} />
        <View style={[isDoing && styles.pill]}>
          <Text
            style={[
              styles.todoText,
              isDone && { textDecorationLine: 'line-through', color: '#9AA0A6' },
            ]}
            numberOfLines={2}
          >
            {todo.title}
          </Text>
        </View>
      </View>
    );
  };

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
          onBlur={submitDraft}
        />
      </View>
    );
  };

  const renderSection = (scope: Scope) => {
    const p = periodOf(scope, viewDate[scope]);
    const list = rangeTodos[scope];
    const loading = loadingByScope[scope];

    return (
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>{scope} 목표</Text>
            <View style={styles.periodNavInline}>
              <TouchableOpacity onPress={() => shiftAnchor(scope, -1)} style={styles.navBtn}>
                <Text style={styles.navBtnText}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={styles.periodLabel}>{p.label}</Text>
              <TouchableOpacity onPress={() => shiftAnchor(scope, 1)} style={styles.navBtn}>
                <Text style={styles.navBtnText}>{'>'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {renderDraftRow(scope)}
        {loading ? (
          <ActivityIndicator />
        ) : list.length === 0 && draftFor !== scope ? (
          <Text style={styles.emptyText}>등록된 할 일이 없어요</Text>
        ) : (
          list.map(renderRow)
        )}

        <Pressable style={styles.addButton} onPress={() => onPressAdd(scope)}>
          <Image source={require('../assets/plus-circle.png')} style={{ width: 28, height: 28 }} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#FFFFFF' }}>
      {/* 상단: 팀원 드롭다운 + 파트 표시 */}
      <View style={styles.selectRow}>
        {/* 팀원 드롭다운 */}
        <View style={styles.dropdown}>
          <Pressable style={styles.dropdownBtn} onPress={() => setOpen((v) => !v)}>
            <Text style={styles.dropdownText}>
              {selected ? selected.name : loadingMembers ? '불러오는 중...' : '팀원 선택'}
            </Text>
            <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
          </Pressable>

          {open && (
            <View style={styles.dropdownList}>
              <FlatList
                data={members}
                keyExtractor={(m) => String(m.user_id)}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setSelected(item);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [styles.dropdownItem, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.dropdownItemText}>{item.name}</Text>
                  </Pressable>
                )}
              />
            </View>
          )}
        </View>

        {/* 파트 표시(읽기전용) */}
        <View style={styles.partWrap}>
          <Text style={styles.partText}>{headerRightPart}</Text>
        </View>
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
  dropdown: { flex: 1, marginRight: 12, position: 'relative' },
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
    position: 'absolute',
    top: '100%',          // 버튼 바로 아래에 위치
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    maxHeight: 220,
    zIndex: 9999,         // iOS
    elevation: 5,         // Android
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemText: { fontSize: 15, color: TEXT_MAIN },

  partWrap: { flexDirection: 'row', alignItems: 'center' },
  partText: { fontSize: 16, fontWeight: '700', color: '#1F2A37' },

  // 섹션
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },

  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    width: '100%',
    marginTop: 4,
    marginBottom: 12,
  },

  periodNavInline: { flexDirection: 'row', alignItems: 'center' },
  periodLabel: { fontSize: 15, color: '#111827', paddingHorizontal: 8 },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  navBtnText: { fontSize: 18, color: '#374151', fontWeight: '700' },

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
});