import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { format, subDays } from 'date-fns';

interface Todo {
  scope_start_date: string;
  status: string;
}

const NUM_DAYS = 60; // 최근 60일만 표시

const HeatmapWidget = ({ teamId }: { teamId?: number | null }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    fetchTodos();
  }, [teamId]);

  const fetchTodos = async () => {
    try {
      const res = await axios.get(`/teams/${teamId}/todos`, {
        headers: { 'x-user-id': '1' }, // ← 실제 로그인한 사용자 ID로 변경
      });
      setTodos(res.data || []);
    } catch (err) {
      console.error('히트맵 데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  // 날짜별 완료 투두 수 계산
  const countByDate: Record<string, number> = {};
  todos.forEach((todo) => {
    if (todo.status === '완료') {
      const date = todo.scope_start_date;
      countByDate[date] = (countByDate[date] || 0) + 1;
    }
  });

  // 최근 NUM_DAYS 날짜 배열 만들기
  const today = new Date();
  const dates: string[] = Array.from({ length: NUM_DAYS }).map((_, i) =>
    format(subDays(today, NUM_DAYS - i - 1), 'yyyy-MM-dd')
  );

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>히트맵</Text>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>히트맵</Text>
      <View style={styles.grid}>
        {dates.map((date) => {
          const count = countByDate[date] || 0;
          return (
            <View
              key={date}
              style={[
                styles.box,
                { backgroundColor: getColor(count) }
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

function getColor(count: number) {
  if (count >= 7) return '#196127';
  if (count >= 5) return '#239a3b';
  if (count >= 3) return '#7bc96f';
  if (count >= 1) return '#c6e48b';
  return '#ebedf0';
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  box: {
    width: 14,
    height: 14,
    margin: 2,
    borderRadius: 2,
  },
});

export default HeatmapWidget;
