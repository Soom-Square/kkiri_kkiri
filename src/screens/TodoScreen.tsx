// src/screens/TodoScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
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
  Alert,
  ToastAndroid
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

// 색상
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

type Team = {
  team_id: number;
  team_name: string;
  part: string;
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

// ----- 주차 라벨: "1일 월~목은 해당달 1주차, 금~일은 전달 마지막 주" 규칙 -----
const koreanWeekOrdinal = (n: number) =>
  ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째'][n - 1] ?? `${n}째`;

const weekLabelByMonth = (weekStart: Date) => {
  const y = weekStart.getFullYear();
  const m = weekStart.getMonth(); // 0~11
  const firstDay = new Date(y, m, 1);
  const dow = firstDay.getDay(); // 0=일,1=월,...

  let firstWeekStart: Date;
  if (dow >= 1 && dow <= 4) {
    // 1일이 월~목 → 그 주가 1주차(그 주 월요일이 firstWeekStart)
    firstWeekStart = new Date(firstDay);
    firstWeekStart.setDate(firstDay.getDate() - (dow - 1));
  } else {
    // 1일이 금~일 → 1주차는 다음 주 월요일부터
    firstWeekStart = new Date(firstDay);
    firstWeekStart.setDate(firstDay.getDate() + (8 - dow));
  }

  const n = Math.floor((+weekStart - +firstWeekStart) / (7 * 24 * 3600 * 1000)) + 1;
  return `${m + 1}월 ${koreanWeekOrdinal(n)}주`;
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
      label: weekLabelByMonth(s), // 규칙 적용 라벨
    };
  }
  const { s, e } = monthRangeFrom(anchor);
  return {
    start: ymd(s),
    end: ymd(e),
    label: `${s.getFullYear()}년 ${s.getMonth() + 1}월`,
  };
};

export default function TodoScreen() {
  const navigation = useNavigation<any>();
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

  // part 수정 모달
  const [partModalVisible, setPartModalVisible] = useState(false);
  const [partInput, setPartInput] = useState('');

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
  const isSavingRef = useRef(false);
  const submitDraft = async () => {
    if (!draftFor || !draftText.trim() || !selected || !user) {
      setDraftFor(null);
      setDraftText('');
      return;
    }
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    try {
      const p = periodOf(draftFor, viewDate[draftFor]);
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
      isSavingRef.current = false;
    }
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

  // 역할 수정 모달 열기
  const openPartModal = () => {
    if (!selected) return;
    setPartInput(selected.part ?? '');
    setPartModalVisible(true);
  };

  const notifyError = (title: string, msg: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(`${title}: ${msg}`, ToastAndroid.LONG);
  } else {
    Alert.alert(title, msg);
  }
};

  const savePart = async () => {
  if (!selected || !user) return;
  const newPart = partInput.trim();
  if (newPart.length === 0) {
    setPartModalVisible(false);
    return;
  }

  try {
    const res = await axios.put(
      `${API_BASE_URL}/team-members/${selected.team_id}/part`,
      { part: newPart },
      { headers: authHeader }
    );
    setSelected((prev) =>
      prev ? { ...prev, part: res.data.part ?? newPart } : prev
    );
    setTeams((prev) =>
      prev.map((t) =>
        t.team_id === selected.team_id
          ? { ...t, part: res.data.part ?? newPart }
          : t
      )
    );
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      'Unknown';
    console.error('파트 저장 실패:', e?.response?.data || e);
    notifyError('파트 저장 실패', String(msg));
  } finally {
    setPartModalVisible(false);
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
            onSubmitEditing={saveEdit.bind(null, todo)}
            onBlur={saveEdit.bind(null, todo)}
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
          // onBlur 제거 또는 isSavingRef로 가드가 있으므로 유지해도 됨
          onBlur={submitDraft}
        />
      </View>
    );
  };

  // 섹션 렌더
  const renderSection = (scope: Scope) => {
    const p = periodOf(scope, viewDate[scope]);
    const list = rangeTodos[scope];
    const loading = loadingByScope[scope];

    // 제목 오른쪽에 기간 네비(← label →), 월간 섹션에는 추가로 '팀원 목표' 버튼
    return (
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
          {/* 왼쪽: 제목 + 기간 네비를 한 줄로 */}
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

          {/* 오른쪽: 월간일 때만 팀원 목표 버튼 */}
          {scope === '월간' && (
            <TouchableOpacity
              style={styles.teamBtn}
              onPress={() =>
                selected && navigation.navigate('TodoTeamScreen', { teamId: selected.team_id })
              }
            >
              <Text style={styles.teamBtnText}>팀원 목표</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ▼ 섹션 구분선 + 간격 */}
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
      {/* 상단 드롭다운 + 역할 + 연필아이콘 */}
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

        <View style={styles.partWrap}>
          <Text style={styles.partText}>{selected?.part ?? '미정'}</Text>
          <Pressable onPress={openPartModal} hitSlop={8}>
            <Image
              source={require('../assets/pencil-01.png')}
              style={{ width: 18, height: 18, marginLeft: 6 }}
              resizeMode="contain"
            />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={['월간', '주간', '일일'] as Scope[]}
        keyExtractor={(item) => item}
        renderItem={({ item }) => renderSection(item)}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* 역할 수정 모달 */}
      <Modal visible={partModalVisible} transparent animationType="fade" onRequestClose={() => setPartModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>역할 수정</Text>
            <TextInput
              value={partInput}
              onChangeText={setPartInput}
              placeholder="역할 입력"
              placeholderTextColor="#A0A0A0"
              style={styles.modalInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={savePart}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]} onPress={() => setPartModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: '#374151' }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: PURPLE }]} onPress={savePart}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  section: { marginBottom: 24 },
  // 얇은 회색 줄 + 위아래 여백
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#acadb0ff', // 연회색
    width: '100%',
    marginTop: 4,
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // 제목과 날짜 네비를 한 줄에 붙이기
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,           // RN 0.71+ 지원. 낮은 버전이면 marginRight로 대체
    flexShrink: 1,     // 라벨 길어도 줄바꿈/수축 되도록
  },

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


  // 기존 periodNav 대신 사용
  periodNavInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodLabel: { fontSize: 15, color: '#111827', paddingHorizontal: 8 },
  navBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FFFFFF' },
  navBtnText: { fontSize: 18, color: '#374151', fontWeight: '700' },

  // 모달
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '86%', backgroundColor: 'white', borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: TEXT_MAIN, marginBottom: 10 },
  modalInput: {
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_MAIN,
    marginBottom: 12,
  },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  modalBtnText: { fontSize: 15, fontWeight: '700' },

  teamBtn: {
  backgroundColor: '#EFEAFF',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  marginLeft: 8,
},
teamBtnText: {
  color: '#7A5AF8',
  fontSize: 14,
  fontWeight: '600',
},
});