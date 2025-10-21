// src/screens/ActivityGoalsScreen.tsx
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Pressable,
  TextInput, Image, ActivityIndicator, Platform, Alert, ToastAndroid, Modal
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const PURPLE = '#7A5AF8';
const INPUT_BG = '#F2F4F7';
const TEXT_MAIN = '#101828';
const TEXT_HINT = '#667085';

type Team = {
  team_id: number;
  team_name: string;
  part?: string;
  due_date?: string | null;
  activity_status?: 'IN_PROGRESS' | 'COMPLETED' | null;
};
type Todo = {
  todo_id: number;
  title: string;
  status: '미진행' | '진행중' | '완료';
  scope_type: '월간' | '주간' | '일일' | '전체';
  scope_start_date: string;
  scope_end_date: string;
};

// 날짜 유틸
const fmt2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toYMD = (d: Date) => `${d.getFullYear()}-${fmt2(d.getMonth() + 1)}-${fmt2(d.getDate())}`;
const toDotYMD = (d: Date) => `${d.getFullYear()}.${fmt2(d.getMonth() + 1)}.${fmt2(d.getDate())}`;
const parseYMD = (s: string) => {
  const [y, m, d] = s.split('-').map((v) => Number(v));
  return new Date(y, m - 1, d);
};

export default function ActivityGoalsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const authHeader = user ? { 'x-user-id': String(user.id) } : undefined;
  const route = useRoute<any>();
  const initialTeamId = route.params?.teamId ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({ title: '활동 설정' });
  }, [navigation]);

  // 활동(팀)
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<Team | null>(null);
  const [open, setOpen] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // 전체 목표
  const [goals, setGoals] = useState<Todo[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);

  // 입력/편집
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftText, setDraftText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // 이중 제출 가드
  const isSubmittingRef = useRef(false);
  const isSavingRef = useRef(false);

  // 일정 관리(마감일)
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [dueDateText, setDueDateText] = useState(''); // YYYY.MM.DD
  const [savingDue, setSavingDue] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // 활동 관리(상태)
  const [activityStatus, setActivityStatus] = useState<'IN_PROGRESS' | 'COMPLETED' | null>(null);
  const [endingActivity, setEndingActivity] = useState(false);

  // 공통 알림
  const notify = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert('', msg);
  };

  // ✅ (선택사항) Todo/Activity 화면과 정렬 일치시키고 싶으면 동일한 sort 사용
  const sortTeams = (arr: Team[]) =>
    [...arr].sort((a, b) => a.team_name.localeCompare(b.team_name));

  // 팀 목록
  useEffect(() => {
    if (!user) return;
    setLoadingTeams(true);
    axios
      .get<Team[]>(`${API_BASE_URL}/my-teams`, { headers: authHeader })
      .then((res) => {
        const data = sortTeams(res.data ?? []);
        setTeams(data);

        if (initialTeamId) {
          const matched = data.find(t => t.team_id === initialTeamId);
          if (matched) {
            setSelected(matched);
            return;
          }
        }
        if (data.length) setSelected(data[0]);
      })
      .catch(() => notify('팀 목록 불러오기 실패'))
      .finally(() => setLoadingTeams(false));
  }, [user, initialTeamId]);

  // 팀이 바뀌면 팀 공용 목표 + due_date + activity_status 로드
  useEffect(() => {
    if (!user || !selected) return;
    fetchTeamWideGoals(selected.team_id);
    fetchTeamMeta(selected.team_id);
  }, [user, selected]);

  const fetchTeamMeta = async (teamId: number) => {
    try {
      const { data } = await axios.get<Team>(`${API_BASE_URL}/teams/${teamId}`, {
        headers: authHeader,
      });
      if (data?.due_date) {
        const d = parseYMD(data.due_date);
        setDueDate(d);
        setDueDateText(toDotYMD(d));
      } else {
        setDueDate(null);
        setDueDateText('');
      }
      setActivityStatus((data.activity_status as any) ?? null);
    } catch {
      // ignore
    }
  };

  // 팀 공용 전체 목표 조회
  const fetchTeamWideGoals = async (teamId: number) => {
    setLoadingGoals(true);
    try {
      const { data } = await axios.get<Todo[]>(
        `${API_BASE_URL}/todos/${teamId}`,
        { headers: authHeader, params: { scope_type: '전체', all: 'true' } }
      );
      setGoals(data ?? []);
    } catch {
      notify('전체 목표 불러오기 실패');
    } finally {
      setLoadingGoals(false);
    }
  };

  const nextStatus = (s: Todo['status']): Todo['status'] =>
    s === '미진행' ? '진행중' : s === '진행중' ? '완료' : '미진행';

  const toggleStatus = async (todo: Todo) => {
    try {
      await axios.put(
        `${API_BASE_URL}/todos/${todo.todo_id}`,
        { status: nextStatus(todo.status) },
        { headers: authHeader }
      );
      setGoals((prev) =>
        prev.map((t) => (t.todo_id === todo.todo_id ? { ...t, status: nextStatus(todo.status) } : t))
      );
    } catch {
      notify('상태 변경 실패');
    }
  };

  // 편집
  const beginEdit = (todo: Todo) => {
    setEditingId(todo.todo_id);
    setEditingText(todo.title);
  };

  const saveEdit = async (todo: Todo) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    const text = editingText.trim();
    try {
      if (text === '') {
        await axios.delete(`${API_BASE_URL}/todos/${todo.todo_id}`, { headers: authHeader });
        setGoals((prev) => prev.filter((t) => t.todo_id !== todo.todo_id));
      } else {
        await axios.put(`${API_BASE_URL}/todos/${todo.todo_id}`, { title: text }, { headers: authHeader });
        setGoals((prev) => prev.map((t) => (t.todo_id === todo.todo_id ? { ...t, title: text } : t)));
      }
    } catch {
      notify('편집/삭제 실패');
    } finally {
      isSavingRef.current = false;
      setEditingId(null);
      setEditingText('');
    }
  };

  // 추가
  const openDraft = () => {
    // 이미 열려있거나 제출 중이면 무시
    if (draftOpen || isSubmittingRef.current) return;
    setDraftOpen(true);
    setDraftText('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submitDraft = async () => {
    if (isSubmittingRef.current) return;
    if (!selected || !user) return;

    const text = draftText.trim();
    if (!text) {
      setDraftOpen(false);
      setDraftText('');
      return;
    }

    try {
      isSubmittingRef.current = true;
      const today = new Date();
      const s = toYMD(today);

      const { data: created } = await axios.post<Todo>(
        `${API_BASE_URL}/todos`,
        {
          team_id: selected.team_id,
          title: text,
          scope_type: '전체',
          scope_start_date: s,
          scope_end_date: s,
        },
        { headers: authHeader }
      );
      setGoals((prev) => [created, ...prev]);
    } catch {
      notify('전체 목표 추가 실패');
    } finally {
      isSubmittingRef.current = false;
      setDraftOpen(false);
      setDraftText('');
    }
  };

  // 날짜 선택/저장
  const openDatePicker = () => setDatePickerVisible(true);
  const onConfirmDate = (picked: Date) => {
    setDueDate(picked);
    setDueDateText(toDotYMD(picked));
    setDatePickerVisible(false);
  };
  const saveDueDate = async () => {
    if (!selected || !dueDate) {
      notify('팀 또는 날짜를 선택하세요');
      return;
    }
    try {
      setSavingDue(true);
      await axios.put(
        `${API_BASE_URL}/teams/${selected.team_id}/due-date`,
        { due_date: toYMD(dueDate) },
        { headers: authHeader }
      );
      notify('마감일이 저장되었습니다');
    } catch {
      notify('마감일 저장 실패');
    } finally {
      setSavingDue(false);
    }
  };

  const endActivity = async () => {
    if (!selected) return;
    if (activityStatus === 'COMPLETED') {
      notify('이미 종료된 활동입니다.');
      return;
    }
    const doEnd = await new Promise<boolean>((resolve) => {
      Alert.alert(
        '활동 종료',
        '활동 종료 시 지난 활동으로 이동되며 되돌릴 수 없습니다.',
        [
          { text: '취소', style: 'cancel', onPress: () => resolve(false) },
          { text: '종료', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });
    if (!doEnd) return;

    try {
      setEndingActivity(true);
      const { data } = await axios.put(
        `${API_BASE_URL}/teams/${selected.team_id}/activity-status`,
        { activity_status: 'COMPLETED' },
        { headers: authHeader }
      );
      setActivityStatus(data.activity_status ?? 'COMPLETED');
      notify('활동이 종료되었습니다.');
    } catch {
      notify('활동 종료 실패');
    } finally {
      setEndingActivity(false);
    }
  };

  const renderRow = (todo: Todo) => {
    const isEditing = editingId === todo.todo_id;
    const isDone = todo.status === '완료';
    return (
      <View key={todo.todo_id} style={styles.row}>
        <Pressable onPress={() => toggleStatus(todo)}>
          <View style={[styles.checkbox, isDone && styles.checkboxOn]}>
            {isDone && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </Pressable>

        <View style={{ width: 10 }} />

        {isEditing ? (
          <TextInput
            ref={inputRef}
            style={[styles.todoText, styles.input]}
            value={editingText}
            onChangeText={setEditingText}
            placeholder="내용을 입력하세요"
            placeholderTextColor="#B3B8C3"
            autoFocus
            returnKeyType="done"
            // 이중 호출 방지: onBlur 제거, 제출은 Enter(완료)로만
            onSubmitEditing={() => saveEdit(todo)}
          />
        ) : (
          <Pressable onLongPress={() => beginEdit(todo)} onPress={() => beginEdit(todo)}>
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

  const renderDraftRow = () =>
    draftOpen ? (
      <View style={styles.row}>
        <View style={styles.checkbox} />
        <View style={{ width: 10 }} />
        <TextInput
          ref={inputRef}
          style={[styles.todoText, styles.input]}
          value={draftText}
          onChangeText={setDraftText}
          placeholder="새 목표 입력"
          placeholderTextColor="#B3B8C3"
          returnKeyType="done"
          // 이중 호출 방지: onBlur 제거, 제출은 Enter(완료)로만
          onSubmitEditing={submitDraft}
        />
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      {/* 제목 + 드롭다운(활동 선택) */}
      <View style={styles.headerArea}>
        <View style={{ position: 'relative' }}>
          <TouchableOpacity
            style={styles.activityBtn}
            onPress={() => setOpen((o) => !o)}
            activeOpacity={0.8}
          >
            <Text style={styles.activityText}>
              {selected ? selected.team_name : loadingTeams ? '불러오는 중...' : '활동 선택'}
            </Text>
            <Text style={styles.chev}>{open ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {open && (
            <View style={styles.dropdown}>
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
      </View>

      {/* 전체 목표 */}
      <Text style={styles.sectionTitle}>전체 목표</Text>
      <View style={styles.divider} />

      {renderDraftRow()}
      {loadingGoals ? (
        <ActivityIndicator />
      ) : goals.length === 0 && !draftOpen ? (
        <Text style={styles.empty}>등록된 목표가 없어요</Text>
      ) : (
        goals.map(renderRow)
      )}

      <View style={{ alignItems: 'center', marginTop: 14 }}>
        <Pressable onPress={openDraft} disabled={draftOpen || isSubmittingRef.current}>
          <Image
            source={require('../assets/plus-circle.png')}
            style={{ width: 32, height: 32, opacity: draftOpen || isSubmittingRef.current ? 0.5 : 1 }}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      {/* 일정 관리 */}
      <Text style={styles.sectionTitle}>일정 관리</Text>
      <View style={styles.divider} />

      <View style={styles.dueRow}>
        <View style={styles.dueInputWrap}>
          <Text style={styles.dueLabel}>마감일 등록</Text>
          <View style={styles.dueInputBox}>
            <TextInput
              style={styles.dueInput}
              placeholder="YYYY.MM.DD"
              placeholderTextColor="#9AA0A6"
              value={dueDateText}
              editable={false}
            />
            <TouchableOpacity onPress={() => setDatePickerVisible(true)} hitSlop={8}>
              <Image
                source={require('../assets/calendar.png')}
                style={{ width: 22, height: 22 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.dueSaveBtn, savingDue && { opacity: 0.6 }]}
          onPress={saveDueDate}
          disabled={savingDue}
        >
          <Text style={styles.dueSaveText}>등록</Text>
        </TouchableOpacity>
      </View>

      {/* 날짜 선택 모달 - Modal 사용으로 다른 UI와 겹침 방지 */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.dateModalBg}>
          <View style={styles.dateModalCard}>
            <Text style={styles.dateModalTitle}>마감일 선택</Text>
            {(() => {
              const DT = require('@react-native-community/datetimepicker').default;
              return (
                <DT
                  value={dueDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event: any, picked?: Date) => {
                    if (Platform.OS === 'android') {
                      if (picked) onConfirmDate(picked);
                      else setDatePickerVisible(false);
                    } else {
                      if (picked) setDueDate(picked);
                    }
                  }}
                  style={{ alignSelf: 'center' }}
                />
              );
            })()}

            {Platform.OS === 'ios' && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]}
                  onPress={() => setDatePickerVisible(false)}
                >
                  <Text style={[styles.modalBtnText, { color: '#374151' }]}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: PURPLE }]}
                  onPress={() => onConfirmDate(dueDate ?? new Date())}
                >
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>확인</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 활동 관리 */}
      <Text style={styles.sectionTitle}>활동 관리</Text>
      <View style={styles.divider} />

      <View style={styles.activityManageSection}>
        <TouchableOpacity
          style={[
            styles.activityEndBtn,
            (activityStatus === 'COMPLETED' || endingActivity) && { opacity: 0.5 },
          ]}
          onPress={endActivity}
          disabled={activityStatus === 'COMPLETED' || endingActivity}
        >
          <Text style={styles.activityEndText}>활동 종료</Text>
        </TouchableOpacity>

        <Text style={styles.activityNote}>
          활동 종료 시 지난 활동으로 이동되며 되돌릴 수 없습니다.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 8 },
  headerArea: { marginBottom: 10 },

  activityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activityText: { flex: 1, color: TEXT_MAIN, fontSize: 18, fontWeight: '800' },
  chev: { color: TEXT_HINT, fontSize: 12, marginLeft: 8 },

  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    maxHeight: 220,
    zIndex: 9999,
    elevation: 8,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemText: { fontSize: 15, color: TEXT_MAIN },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    backgroundColor: '#ACADB0',
    marginVertical: 12,
  },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#C7C9D1',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  checkboxOn: { backgroundColor: PURPLE, borderColor: PURPLE },
  checkMark: { color: '#fff', fontSize: 14, lineHeight: 16, fontWeight: '800' },

  todoText: { fontSize: 16, color: TEXT_MAIN },
  input: { flex: 1, paddingVertical: 4 },
  empty: { fontSize: 14, color: '#999' },

  // 일정 관리
  dueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 18, marginTop: 6 },
  dueInputWrap: { flex: 1 },
  dueLabel: { fontSize: 13, color: '#111827', marginBottom: 6, fontWeight: '600' },
  dueInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dueInput: { flex: 1, fontSize: 16, color: TEXT_MAIN, marginRight: 8 },

  dueSaveBtn: {
    backgroundColor: PURPLE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dueSaveText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // 날짜 모달
  dateModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModalCard: {
    width: '86%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
  },
  dateModalTitle: { fontSize: 16, fontWeight: '700', color: TEXT_MAIN, marginBottom: 10 },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  modalBtnText: { fontSize: 15, fontWeight: '700' },

  activityManageSection: {
    alignItems: 'flex-start',
    marginTop: 6,
    marginBottom: 8,
  },
  activityEndBtn: {
    backgroundColor: PURPLE,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 22,
    alignSelf: 'flex-start',
  },
  activityEndText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  activityNote: {
    fontSize: 12,
    color: '#9AA0A6',
    marginTop: 8,
    textAlign: 'left',
    paddingLeft: 4,
  },
});