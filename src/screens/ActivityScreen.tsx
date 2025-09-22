// src/screens/ActivityScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
  ScrollView,
  //RefreshControl,
} from 'react-native';
import { RootStackParamList } from '../types'; 
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'     // Android 에뮬레이터
    : 'http://localhost:3000';   // iOS 시뮬레이터

type Nav = NativeStackNavigationProp<RootStackParamList>;

type ActivityOption = {
  teamId: number;
  teamName: string;
  role: 'LEADER' | 'MEMBER' | string;
};

type DailyTodo = {
  todo_id: number;
  title: string;
  status: '미진행' | '진행중' | '완료';
  assigned_user_name: string;
};

type MonthlyProgress = {
  total_todos: number;
  completed_todos: number;
  progress_percentage: number;
  period: {
    start: string;
    end: string;
  };
};

const PURPLE = '#7A5AF8';
const INPUT_BG = '#F2F4F7';
const TEXT_HINT = '#667085';
const TEXT_MAIN = '#101828';

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

// 이슈트래커 컴포넌트
const IssueTracker: React.FC<{ teamId: number | null; onRefresh?: () => void }> = ({ teamId, onRefresh }) => {
  const [dailyTodos, setDailyTodos] = useState<DailyTodo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 일일 todo 데이터 가져오기 함수
  const fetchDailyTodos = useCallback(async () => {
    if (!teamId) {
      setDailyTodos([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/daily-todos`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setDailyTodos(data || []);
    } catch (error) {
      console.error('일일 todo 가져오기 실패:', error);
      setDailyTodos([]);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  // 팀이 선택되었을 때 일일 todo 데이터 가져오기
  useEffect(() => {
    fetchDailyTodos();
  }, [fetchDailyTodos]);

  // 화면 포커스시 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      fetchDailyTodos();
    }, [fetchDailyTodos])
  );

  // 30초마다 자동 새로고침
  useEffect(() => {
    if (!teamId) return;

    const interval = setInterval(() => {
      fetchDailyTodos();
    }, 30000); // 30초

    return () => clearInterval(interval);
  }, [teamId, fetchDailyTodos]);

  // status별로 todo 그룹핑
  const groupedTodos = useMemo(() => {
    return {
      '할 일': dailyTodos.filter(todo => todo.status === '미진행'),
      '진행중': dailyTodos.filter(todo => todo.status === '진행중'),
      '완료!': dailyTodos.filter(todo => todo.status === '완료'),
    };
  }, [dailyTodos]);

  const renderTodoItem = (todo: DailyTodo) => (
    <View key={todo.todo_id} style={styles.todoItem}>
      <Text style={styles.todoTitle} numberOfLines={2}>{todo.title}</Text>
      <Text style={styles.todoAssignee}>{todo.assigned_user_name}</Text>
    </View>
  );

  const renderSection = (title: string, todos: DailyTodo[], isActive: boolean) => {
    const tabStyles = getSectionTabStyles(title);
    
    return (
      <View style={styles.sectionContainer}>
        {/* 섹션 탭 헤더 - 왼쪽 정렬, 각각 다른 색상 */}
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
        
        {/* 섹션 콘텐츠 박스 - 원래 스타일 유지 */}
        <View style={styles.sectionBox}>
          {isLoading ? (
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
        {renderSection('할 일', groupedTodos['할 일'], true)}
        {renderSection('진행중', groupedTodos['진행중'], true)}
        {renderSection('완료!', groupedTodos['완료!'], true)}
      </View>
    </View>
  );
};

export default function ActivityScreen() {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const navigation = useNavigation<Nav>();

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ActivityOption[]>([]);
  const [selected, setSelected] = useState<ActivityOption | null>(null);
  const [monthlyProgress, setMonthlyProgress] = useState<MonthlyProgress | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  //const [refreshing, setRefreshing] = useState(false);

  const API_BASE = useMemo(() => API_BASE_URL, []);

  // 월간 진행률 가져오기 함수
  const fetchMonthlyProgress = useCallback(async (teamId: number) => {
    try {
      setIsLoadingProgress(true);
      const response = await fetch(`${API_BASE}/teams/${teamId}/monthly-progress`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: MonthlyProgress = await response.json();
      setMonthlyProgress(data);
      console.log('월간 진행률 업데이트:', data);
    } catch (error) {
      console.error('월간 진행률 조회 실패:', error);
      setMonthlyProgress(null);
    } finally {
      setIsLoadingProgress(false);
    }
  }, [API_BASE]);

  // 팀 목록 가져오기 함수
  const fetchTeams = useCallback(async () => {
    if (!currentUserId) {
      console.log('⚠️ 로그인된 사용자 없음');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/${currentUserId}/teams`);
      const data: ActivityOption[] = await res.json();
      setOptions(data);
      if (data.length > 0 && !selected) {
        setSelected(data[0]);
      }
    } catch (e) {
      console.warn('활동 목록 불러오기 실패:', e);
    }
  }, [API_BASE, currentUserId, selected]);

  // 전체 데이터 새로고침
  /*const refreshAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchTeams();
      if (selected?.teamId) {
        await fetchMonthlyProgress(selected.teamId);
      }
    } finally {
      setRefreshing(false);
    }
  }, [fetchTeams, selected?.teamId, fetchMonthlyProgress]);
*/
  // 팀 목록 조회 (초기 로드)
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // 선택된 팀의 월간 진행률 조회
  useEffect(() => {
    if (!selected?.teamId) {
      setMonthlyProgress(null);
      return;
    }
    fetchMonthlyProgress(selected.teamId);
  }, [selected?.teamId, fetchMonthlyProgress]);

  // 화면 포커스시 데이터 새로고침
  /*useFocusEffect(
    useCallback(() => {
      refreshAllData();
    }, [refreshAllData])
  );
*/
  // 30초마다 진행률 자동 새로고침
  useEffect(() => {
    if (!selected?.teamId) return;

    const interval = setInterval(() => {
      fetchMonthlyProgress(selected.teamId);
    }, 30000); // 30초

    return () => clearInterval(interval);
  }, [selected?.teamId, fetchMonthlyProgress]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.container, { paddingTop: 12 }]}>
        {/* 상단 로고 + 아이콘 */}
        <View style={styles.topRow}>
          <Text style={styles.logo}>끼리끼리</Text>

          <View style={styles.iconRow}>
            <Pressable
              hitSlop={10}
              onPress={() => navigation.navigate('MyActivityScreen')}
            >
              <Image
                source={require('../assets/folder.png')}
                style={styles.icon}
                resizeMode="contain"
              />
            </Pressable>

            <Pressable
              hitSlop={10}
              onPress={() => navigation.navigate('ActivitySettingScreen')}
            >
              <Image
                source={require('../assets/settings-01.png')}
                style={[styles.icon, { marginLeft: 16 }]}
                resizeMode="contain"
              />
            </Pressable>

            <Pressable
              hitSlop={10}
              onPress={() => navigation.navigate('NotificationScreen')}
            >
              <Image
                source={require('../assets/bell.png')}
                style={[styles.icon, { marginLeft: 16 }]}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        </View>

        {/* 드롭다운 + 역할 */}
        <View style={styles.selectRow}>
          <View style={styles.dropdown}>
            <Pressable style={styles.dropdownBtn} onPress={() => setOpen(v => !v)}>
              <Text style={styles.dropdownText}>
                {selected ? selected.teamName : '내 활동 선택'}
              </Text>
              <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
            </Pressable>

            {open && (
              <View style={styles.dropdownList}>
                <FlatList
                  data={options}
                  keyExtractor={(item) => String(item.teamId)}
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
                      <Text style={styles.dropdownItemText}>{item.teamName}</Text>
                    </Pressable>
                  )}
                />
              </View>
            )}
          </View>

          <Text style={styles.roleText}>
            {selected?.role ? humanizeRole(selected.role) : '—'}
          </Text>
        </View>

        {/* 진행률 표시 영역 */}
        <View style={styles.progressSection}>
          {isLoadingProgress ? (
            <Text style={styles.progressTitle}>진행률 로딩 중...</Text>
          ) : monthlyProgress ? (
            <>
              <Text style={styles.progressTitle}>
                이번 달 {monthlyProgress.progress_percentage}% 완료!
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${monthlyProgress.progress_percentage}%` }]} />
              </View>
              <Text style={styles.progressLabel}>
                {monthlyProgress.completed_todos}/{monthlyProgress.total_todos} 완료 (이번달)
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.progressTitle}>
                {selected ? '진행률 데이터 없음' : '팀을 선택해주세요'}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '0%' }]} />
              </View>
              <Text style={styles.progressLabel}>이번달</Text>
            </>
          )}
        </View>

        {/* 이슈트래커 모듈 - 스크롤 가능한 영역 */}
        <ScrollView 
          style={styles.issueTrackerScrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.issueTrackerScrollContent}
          /*refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshAllData}
              colors={[PURPLE]}
              tintColor={PURPLE}
            />
          }*/
        >
          <IssueTracker teamId={selected?.teamId || null} />
        </ScrollView>

        {/* 플러스 버튼 */}
        <Pressable
          style={styles.fab}
          onPress={() => navigation.navigate('TodoScreen')}
        >
          <Image
            source={require('../assets/plus-circle.png')}
            style={{ width: 56, height: 56 }}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function humanizeRole(role: string) {
  if (!role) return '';
  const upper = role.toUpperCase();
  if (upper === 'LEADER') return '팀장';
  if (upper === 'MEMBER') return '팀원';
  return role;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    fontStyle: 'normal',

    color: PURPLE,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 26,
    height: 26,
  },
  selectRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2A37',
  },
  progressSection: {
    marginTop: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_MAIN,
    marginBottom: 12,
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: PURPLE,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 14,
    color: TEXT_HINT,
  },
  issueTrackerScrollView: {
    flex: 1,
  },
  issueTrackerScrollContent: {
    paddingBottom: 100, // 플러스 버튼 공간
  },
  // 이슈트래커 스타일
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
  sectionsContainer: {
    // gap 대신 marginBottom 사용
  },
  sectionContainer: {
    marginBottom: 12,
  },
  sectionTabContainer: {
    alignItems: 'flex-start', // 이게 있어야 탭이 내용 크기만큼만 나옴
    paddingLeft: 36,
    marginBottom: 11,
  },
  // 섹션 탭 (할 일, 진행중, 완료!) - 이제 동적으로 색상이 적용됨
  sectionTab: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeSectionTab: {
    backgroundColor: '#F3F4F6',
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeSectionTabText: {
    color: TEXT_MAIN,
    fontWeight: '600',
  },
  // 섹션 박스 (고정 크기)
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
  // Todo 아이템 스타일 (텍스트만)
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
});