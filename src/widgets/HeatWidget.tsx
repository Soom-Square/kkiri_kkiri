import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, format, isSameMonth } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const API_BASE_URL = __DEV__
  ? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
  : 'https://your.api';

const TEXT_MAIN = '#101828';
const TEXT_HINT = '#667085';
const KST = 'Asia/Seoul';

type Todo = {
  scope_start_date: string;
  status: string;
};

type Props = { 
  teamId?: number | null;
  refreshKey?: number;
};

export default function HeatmapWidget({ teamId, refreshKey }: Props) {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  /** ✅ 월별 데이터 요청 */
  const fetchTodos = useCallback(async () => {
    if (!teamId || !user?.id) return;

    const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/teams/${teamId}/todos?user_id=${user.id}&start=${startDate}&end=${endDate}&scope_type=일일`,
        { headers: { 'x-user-id': String(user.id) } }
      );
      setTodos(res.data || []);
    } catch (err) {
      console.error('히트맵 데이터 로드 실패:', err);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, user?.id, currentMonth]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos, refreshKey]);

  /** ✅ 날짜별 완료 수 계산 */
  const countByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    
    console.log('=== 히트맵 디버깅 ===');
    console.log('총 todos:', todos.length);
    
    // 🔥 중복 forEach 제거 - 단 한 번만 순회!
    todos.forEach((todo) => {
      console.log('todo:', todo.status, todo.scope_start_date);
      
      if (todo.status === '완료') {
        try {
          // 🔥 타임존 변환 로직 유지 (원래대로)
          const utcDate = new Date(todo.scope_start_date);
          const kstDate = toZonedTime(utcDate, KST);
          const dateStr = format(kstDate, 'yyyy-MM-dd');

          counts[dateStr] = (counts[dateStr] || 0) + 1;

          console.log('✅ 완료된 목표:', dateStr, '(원본:', todo.scope_start_date, ')');
        } catch (err) {
          console.warn('❌ 날짜 변환 오류:', todo.scope_start_date, err);
        }
      }
    });
    
    console.log('🟪 countByDate:', counts);
    return counts;
  }, [todos]);

  /** ✅ 한 달 날짜 매트릭스 구성 */
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const daysMatrix: Date[][] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    daysMatrix.push(week);
  }

  /** ✅ 색상 지정 */
  const getColor = (count: number) => {
    if (count >= 7) return '#6f38f0ff';
    if (count >= 4) return '#a583f4ff';
    if (count >= 1) return '#d2c8fdff';
    return '#F3F4F6';
  };

  const handlePrevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  /** ✅ 렌더링 */
  return (
    <View style={styles.container}>
      {/* 제목 및 구분선 */}
      <View style={styles.header}>
        <Text style={styles.title}>히트맵</Text>
        <View style={styles.divider} />
      </View>

      {/* 월 변경 버튼 */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={handlePrevMonth}>
          <Text style={styles.arrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{format(currentMonth, 'yy.MM')}월</Text>
        <TouchableOpacity onPress={handleNextMonth}>
          <Text style={styles.arrow}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="#8B5CF6" />
      ) : (
        <>
          {/* 요일 헤더 */}
          <View style={styles.weekDaysRow}>
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
              <Text key={d} style={styles.weekDayText}>
                {d}
              </Text>
            ))}
          </View>

          {/* 달력 형태 히트맵 */}
          <View style={styles.calendarGrid}>
            {daysMatrix.map((week, wIdx) => (
              <View key={wIdx} style={styles.weekRow}>
                {week.map((date, dIdx) => {
                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  const count = countByDate[dateStr] || 0;
                  const isOtherMonth = !isSameMonth(date, currentMonth);
                  return (
                    <View
                      key={dIdx}
                      style={[
                        styles.dayBox,
                        { backgroundColor: isOtherMonth ? '#E5E7EB' : getColor(count) },
                      ]}
                    >
                      <Text style={styles.dayText}>
                        {isSameMonth(date, currentMonth) ? date.getDate() : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16, marginBottom: 20 },
  header: { marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '700', color: TEXT_MAIN, marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#E5E7EB', width: '100%' },

  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  arrow: { fontSize: 16, color: TEXT_HINT, marginHorizontal: 12 },
  monthText: { fontSize: 14, fontWeight: '600', color: TEXT_HINT },

  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
    marginHorizontal: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_HINT,
  },

  calendarGrid: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 3,
  },
  dayBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: { fontSize: 10, color: TEXT_MAIN },
});