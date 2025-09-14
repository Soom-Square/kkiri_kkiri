// src/screens/TodoScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

type Scope = '월간' | '주간' | '일일';

type Todo = {
  todo_id: number;
  title: string;
  status: '미진행' | '진행중' | '완료';
  scope_type: Scope;
  scope_start_date?: string;
  scope_end_date?: string;
};

type Team = {
  team_id: number;
  team_name: string;
  role: string;
};

const PURPLE = '#7A5AF8';
const LILAC = '#EFEAFF';
const INPUT_BG = '#F2F4F7';
const TEXT_MAIN = '#101828';
const TEXT_HINT = '#667085';

export default function TodoScreen() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<Team | null>(null);
  const [open, setOpen] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingTodos, setLoadingTodos] = useState(false);

  // 섹션별 새 항목 입력 상태
  const [draftFor, setDraftFor] = useState<Scope | null>(null);
  const [draftText, setDraftText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const authHeader = user ? { 'x-user-id': String(user.id) } : undefined;

  // 팀 목록
  useEffect(() => {
    if (!user) return;
    setLoadingTeams(true);
    axios
      .get<Team[]>(`${API_BASE_URL}/my-teams`, { headers: authHeader })
      .then((res) => {
        setTeams(res.data ?? []);
        if (res.data?.length) setSelected(res.data[0]);
      })
      .catch((err) => console.error('❌ 팀 목록 불러오기 실패:', err))
      .finally(() => setLoadingTeams(false));
  }, [user]);

  // 해당 팀의 todo
  useEffect(() => {
    if (!user || !selected) return;
    setLoadingTodos(true);
    axios
      .get<Todo[]>(`${API_BASE_URL}/todos/${selected.team_id}`, { headers: authHeader })
      .then((res) => setTodos(res.data ?? []))
      .catch((err) => console.error('❌ 투두 불러오기 실패:', err))
      .finally(() => setLoadingTodos(false));
  }, [user, selected]);

  // 상태 순환
  const nextStatus = (s: Todo['status']): Todo['status'] =>
    s === '미진행' ? '진행중' : s === '진행중' ? '완료' : '미진행';

  const cycleStatus = (todo: Todo) => {
    const newStatus = nextStatus(todo.status);
    axios
      .put(`${API_BASE_URL}/todos/${todo.todo_id}`, { status: newStatus }, { headers: authHeader })
      .then(() => {
        setTodos((prev) =>
          prev.map((t) => (t.todo_id === todo.todo_id ? { ...t, status: newStatus } : t))
        );
      })
      .catch((err) => console.error('❌ 상태 변경 실패:', err));
  };

  // 체크박스 렌더
  const renderCheckbox = (status: Todo['status']) => {
    const isDone = status === '완료';
    return (
      <View style={[styles.checkboxBase, isDone && styles.checkboxChecked]}>
        {isDone && <Text style={styles.checkMark}>✓</Text>}
      </View>
    );
  };

  // 섹션별 날짜 계산
  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const format = (d: Date) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const getDatesForScope = (scope: Scope) => {
    const now = new Date();
    if (scope === '일일') {
      const s = format(now);
      return { start: s, end: s };
    }
    if (scope === '주간') {
      // 월요일 시작 기준
      const day = now.getDay(); // 일0 월1 ...
      const diffToMon = (day + 6) % 7; // 월0, 화1...
      const start = new Date(now);
      start.setDate(now.getDate() - diffToMon);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: format(start), end: format(end) };
    }
    // 월간
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: format(start), end: format(end) };
  };

  // “+” 눌렀을 때: 해당 섹션에 입력행 표시
  const onPressAdd = (scope: Scope) => {
    setDraftFor(scope);
    setDraftText('');
    // 약간의 딜레이 후 포커스
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // 입력 제출 → 서버 저장
  const submitDraft = async () => {
    if (!draftFor || !draftText.trim() || !selected || !user) {
      setDraftFor(null);
      setDraftText('');
      return;
    }
    try {
      const { start, end } = getDatesForScope(draftFor);
      const payload = {
        team_id: selected.team_id,
        title: draftText.trim(),
        scope_type: draftFor,
        scope_start_date: start,
        scope_end_date: end,
      };
      const { data: created } = await axios.post<Todo>(
        `${API_BASE_URL}/todos`,
        payload,
        { headers: authHeader }
      );

      // 목록에 반영
      setTodos((prev) => [created, ...prev]);
    } catch (e) {
      console.error('❌ 새 todo 생성 실패:', e);
    } finally {
      setDraftFor(null);
      setDraftText('');
    }
  };

  // 행 렌더
  const TitleWithHighlight = ({ title, status }: { title: string; status: Todo['status'] }) => {
    const isDoing = status === '진행중';
    const isDone = status === '완료';
    return (
      <View style={[isDoing && styles.pill]}>
        <Text
          style={[
            styles.todoText,
            isDone && { textDecorationLine: 'line-through', color: '#9AA0A6' },
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
    );
  };

  const renderRow = (todo: Todo) => (
    <Pressable key={todo.todo_id} style={styles.row} onPress={() => cycleStatus(todo)}>
      {renderCheckbox(todo.status)}
      <View style={{ width: 8 }} />
      <TitleWithHighlight title={todo.title} status={todo.status} />
    </Pressable>
  );

  // 입력행 렌더
  const renderDraftRow = (scope: Scope) => {
    if (draftFor !== scope) return null;
    return (
      <View style={styles.row}>
        {/* 새 항목은 기본 미진행 (빈 체크박스) */}
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

  const renderSection = (label: Scope) => {
    const filtered = todos.filter((t) => t.scope_type === label);
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{label} 목표</Text>
        </View>

        {renderDraftRow(label)}

        {filtered.length === 0 && draftFor !== label ? (
          <Text style={styles.emptyText}>등록된 할 일이 없어요</Text>
        ) : (
          filtered.map(renderRow)
        )}

        <Pressable style={styles.addButton} onPress={() => onPressAdd(label)}>
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

      {/* 섹션 */}
      {loadingTodos ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={['월간', '주간', '일일'] as Scope[]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => renderSection(item)}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
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
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
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

  input: {
    flex: 1,
    paddingVertical: 4,
  },

  addButton: { marginTop: 8, alignItems: 'center' },
});