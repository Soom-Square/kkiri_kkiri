// src/screens/TodoScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

type Todo = {
  todo_id: number;
  title: string;
  status: '미진행' | '진행중' | '완료';
  scope_type: '월간' | '주간' | '일일';
};

type Team = {
  team_id: number;
  team_name: string;
  role: string;
};

export default function TodoScreen() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<Team | null>(null);
  const [open, setOpen] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingTodos, setLoadingTodos] = useState(false);

  const authHeader = user ? { 'x-user-id': String(user.id) } : undefined;

  // 팀 목록 불러오기
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

  // 투두 불러오기
  useEffect(() => {
    if (!user || !selected) return;
    setLoadingTodos(true);
    axios
      .get<Todo[]>(`${API_BASE_URL}/todos/${selected.team_id}`, { headers: authHeader })
      .then((res) => setTodos(res.data ?? []))
      .catch((err) => console.error('❌ 투두 불러오기 실패:', err))
      .finally(() => setLoadingTodos(false));
  }, [user, selected]);

  const toggleStatus = (todo: Todo) => {
    const newStatus: Todo['status'] = todo.status === '완료' ? '미진행' : '완료';
    axios
      .put(`${API_BASE_URL}/todos/${todo.todo_id}`, { status: newStatus }, { headers: authHeader })
      .then(() => {
        setTodos((prev) =>
          prev.map((t) => (t.todo_id === todo.todo_id ? { ...t, status: newStatus } : t))
        );
      })
      .catch((err) => console.error('❌ 상태 변경 실패:', err));
  };

  const renderSection = (label: '월간' | '주간' | '일일') => {
    const filtered = todos.filter((t) => t.scope_type === label);
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{label} 목표</Text>
        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>등록된 할 일이 없어요</Text>
        ) : (
          filtered.map((todo) => (
            <TouchableOpacity key={todo.todo_id} style={styles.todoItem} onPress={() => toggleStatus(todo)}>
              <Text
                style={[
                  styles.todoText,
                  todo.status === '완료' && { textDecorationLine: 'line-through', color: '#999' },
                ]}
              >
                {todo.title}
              </Text>
            </TouchableOpacity>
          ))
        )}
        <TouchableOpacity style={styles.addButton}>
          <Text style={{ fontSize: 20 }}>＋</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
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
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      pressed && { opacity: 0.6 },
                    ]}
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
          data={['월간', '주간', '일일']}
          keyExtractor={(item) => item}
          renderItem={({ item }) => renderSection(item as '월간' | '주간' | '일일')}
        />
      )}
    </View>
  );
}

const PURPLE = '#7A5AF8';
const INPUT_BG = '#F2F4F7';
const TEXT_MAIN = '#101828';
const TEXT_HINT = '#667085';

const styles = StyleSheet.create({
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dropdown: {
    flex: 1,
    marginRight: 12,
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
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    maxHeight: 220,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    color: TEXT_MAIN,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2A37',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  todoItem: {
    paddingVertical: 6,
  },
  todoText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    paddingVertical: 6,
  },
  addButton: {
    marginTop: 8,
    alignItems: 'center',
  },
});