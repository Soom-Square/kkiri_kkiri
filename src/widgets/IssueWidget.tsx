// src/widgets/IssueWidget.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Platform, } from 'react-native';


const API_BASE_URL = __DEV__
  ? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
  : 'https://your.api'; // 프로덕션 주소

type Props = { teamId?: number | null };

type DailyTodo = {
  todo_id: number;
  title: string;
  status: '미진행' | '진행중' | '완료';
  assigned_user_name: string;
};

const TEXT_MAIN = '#101828';
const TEXT_HINT = '#667085';

export default function IssueWidget({ teamId }: Props) {
  const [items, setItems] = useState<DailyTodo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDaily = useCallback(async () => {
    if (!teamId) { setItems([]); return; }
    try {
      setLoading(true);
      const r = await fetch(`${API_BASE_URL}/teams/${teamId}/daily-todos`);
      const json: DailyTodo[] = await r.json();
      setItems(Array.isArray(json) ? json : []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { fetchDaily(); }, [fetchDaily]);

  // 상태별 그룹
  const groups = useMemo(() => ({
    '할 일':   items.filter(i => i.status === '미진행'),
    '진행중':  items.filter(i => i.status === '진행중'),
    '완료!':   items.filter(i => i.status === '완료'),
  }), [items]);

  const Section = ({ title, data }: { title: string; data: DailyTodo[] }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.tag}>{title}</Text>
      <View style={styles.box}>
        {loading ? (
          <Text style={styles.empty}>로딩 중…</Text>
        ) : data.length ? (
          <FlatList
            data={data}
            keyExtractor={(t) => String(t.todo_id)}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.assignee}>{item.assigned_user_name}</Text>
              </View>
            )}
            scrollEnabled={false}      // ← 위젯 내 스크롤 금지 (부모 스크롤 사용)
          />
        ) : (
          <Text style={styles.empty}>
            {title === '할 일' ? '할 일이 없습니다' :
             title === '진행중' ? '진행 중인 일이 없습니다' :
             '완료된 일이 없습니다'}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.header}>이슈트래커</Text>
      <Section title="할 일"  data={groups['할 일']} />
      <Section title="진행중" data={groups['진행중']} />
      <Section title="완료!"  data={groups['완료!']} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F7F7FD',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6E6F5',
    marginBottom: 14,
  },
  header: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: TEXT_MAIN },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 14, borderWidth: 1,
    borderColor: '#E5E7EB', backgroundColor: '#FFFFFF',
    color: TEXT_MAIN, fontSize: 12, fontWeight: '600', marginBottom: 8,
  },
  box: {
    borderRadius: 18, borderWidth: 1, borderColor: '#EBE9FE',
    backgroundColor: '#F4F3FF', padding: 12,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: { flex: 1, marginRight: 12, color: TEXT_MAIN, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  assignee: { fontSize: 12, color: '#000', fontWeight: '500' },
  empty: { textAlign: 'center', color: TEXT_HINT, fontSize: 13, marginVertical: 8 },
});