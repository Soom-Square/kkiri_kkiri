import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';

const API_BASE_URL = __DEV__
  ? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
  : 'https://your.api'; // 프로덕션 주소

type Props = { 
  teamId?: number | null; 
  refreshKey?: number; // ✅ 상위에서 새로고침 트리거 받을 prop 추가
};

type DailyTodo = {
  todo_id: number;
  title: string;
  status: '미진행' | '진행중' | '완료';
  assigned_user_name: string;
};

const TEXT_MAIN = '#101828';
const TEXT_HINT = '#667085';

// 섹션 탭별 색상 스타일
const getSectionTabStyles = (sectionType: string) => {
  switch (sectionType) {
    case '할 일':
      return {
        backgroundColor: '#FFFFFF',
        borderColor: '#101828',
        textColor: TEXT_MAIN,
      };
    case '진행중':
      return {
        backgroundColor: '#D9D6FE',
        borderColor: '#D9D6FE',
        textColor: TEXT_MAIN,
      };
    case '완료!':
      return {
        backgroundColor: '#9B8AFB',
        borderColor: '#9B8AFB',
        textColor: '#000000',
      };
    default:
      return {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        textColor: TEXT_MAIN,
      };
  }
};

export default function IssueWidget({ teamId, refreshKey }: Props) {
  const [items, setItems] = useState<DailyTodo[]>([]);
  const [loading, setLoading] = useState(false);

  /** ✅ 서버에서 todo 가져오기 */
  const fetchDaily = useCallback(async () => {
    if (!teamId) { 
      setItems([]); 
      return; 
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/teams/${teamId}/daily-todos`);
      if (!res.ok) {
        console.error('❌ 서버 응답 오류:', res.status);
        setItems([]);
        return;
      }

      const json: DailyTodo[] = await res.json();
      setItems(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error('일일 todo 가져오기 실패:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  /** ✅ 새로고침 트리거(refreshKey)나 teamId 변경 시 데이터 재요청 */
  useEffect(() => {
    fetchDaily();
  }, [fetchDaily, refreshKey]); // 🔥 핵심 수정 포인트

  // 상태별 그룹 나누기
  const groups = useMemo(() => ({
    '할 일': items.filter(i => i.status === '미진행'),
    '진행중': items.filter(i => i.status === '진행중'),
    '완료!': items.filter(i => i.status === '완료'),
  }), [items]);

  const renderTodoItem = (todo: DailyTodo) => (
    <View key={todo.todo_id} style={styles.todoItem}>
      <Text style={styles.todoTitle} numberOfLines={2}>{todo.title}</Text>
      <Text style={styles.todoAssignee}>{todo.assigned_user_name}</Text>
    </View>
  );

  const renderSection = (title: string, todos: DailyTodo[]) => {
    const tabStyles = getSectionTabStyles(title);
    
    return (
      <View style={styles.sectionContainer} key={title}>
        {/* 섹션 탭 헤더 */}
        <View style={styles.sectionTabContainer}>
          <View style={[
            styles.sectionTab, 
            {
              backgroundColor: tabStyles.backgroundColor,
              borderColor: tabStyles.borderColor,
            }
          ]}>
            <Text style={[styles.sectionTabText, { color: tabStyles.textColor }]}>
              {title}
            </Text>
          </View>
        </View>
        
        {/* 섹션 콘텐츠 박스 */}
        <View style={styles.sectionBox}>
          {loading ? (
            <Text style={styles.loadingText}>로딩 중...</Text>
          ) : (
            <ScrollView 
              style={styles.sectionScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sectionContent}
            >
              {todos.length > 0 ? (
                todos.map(renderTodoItem)
              ) : (
                <Text style={styles.emptyText}>
                  {title === '할 일' ? '할 일이 없습니다' :
                   title === '진행중' ? '진행 중인 일이 없습니다' : 
                   '완료된 일이 없습니다'}
                </Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    );
  };

  if (!teamId) {
    return (
      <View style={styles.issueTracker}>
        <View style={styles.issueTrackerHeader}>
          <Text style={styles.issueTrackerTitle}>이슈트래커</Text>
          <View style={styles.divider} />
        </View>
        <Text style={styles.noTeamText}>팀을 선택해주세요</Text>
      </View>
    );
  }

  return (
    <View style={styles.issueTracker}>
      <View style={styles.issueTrackerHeader}>
        <Text style={styles.issueTrackerTitle}>이슈트래커</Text>
        <View style={styles.divider} />
      </View>
      
      {/* 세로로 배치된 섹션들 */}
      <View style={styles.sectionsContainer}>
        {renderSection('할 일', groups['할 일'])}
        {renderSection('진행중', groups['진행중'])}
        {renderSection('완료!', groups['완료!'])}
      </View>
    </View>
  );
}

/** ✅ 스타일 정의 */
const styles = StyleSheet.create({
  issueTracker: {
    marginTop: 16,
  },
  issueTrackerHeader: {
    marginBottom: 27,
  },
  issueTrackerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_MAIN,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    width: '100%',
  },
  sectionsContainer: {},
  sectionContainer: {
    marginBottom: 12,
  },
  sectionTabContainer: {
    alignItems: 'flex-start',
    paddingLeft: 36,
    marginBottom: 11,
  },
  sectionTab: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionBox: {
    width: 368,
    height: 154,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EBE9FE',
    backgroundColor: '#F4F3FF',
    padding: 16,
    alignSelf: 'center',
  },
  sectionScrollView: {
    flex: 1,
  },
  sectionContent: {
    paddingBottom: 8,
  },
  todoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  todoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_MAIN,
    flex: 1,
    marginRight: 12,
    lineHeight: 20,
  },
  todoAssignee: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_HINT,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
  },
  noTeamText: {
    fontSize: 16,
    color: TEXT_HINT,
    textAlign: 'center',
    marginTop: 40,
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_HINT,
    textAlign: 'center',
    marginTop: 20,
  },
});
