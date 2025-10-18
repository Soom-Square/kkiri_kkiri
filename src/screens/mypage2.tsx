// src/screens/MyPage2.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// =======================
// 타입 정의
// =======================
const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000' // Android 에뮬레이터
    : 'http://localhost:3000'; // iOS 시뮬레이터
// 실기기(iPhone)에서 테스트 시: const API_BASE_URL = 'http://<Mac IP>:3000';

interface User {
  id: number;
  email: string;
  name: string;
  department?: string;
  student_number?: string;
  birth?: string;
  profile_picture?: string;
}

type RootStackParamList = {
  MyPage2: { user: User };
  MyPage3: { user: User; selectedMember: SelectedMember };
};

type MyPage2NavigationProp = StackNavigationProp<RootStackParamList, 'MyPage2'>;
type MyPage2RouteProp = RouteProp<RootStackParamList, 'MyPage2'>;

interface SelectedMember {
  id: number;
  name: string;
  department: string;
  team_id: number;
  activity_title: string;
}

interface TeamMember {
  id: number;
  name: string;
  department: string;
  selected?: boolean;
}

interface TeamGroup {
  id: number;
  title: string;
  members: TeamMember[];
}

// =======================
// 공용 유틸: 안전한 JSON fetch
// =======================
async function fetchJson(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const ct = res.headers.get('content-type') || '';
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} @ ${url}\n${text.slice(0, 200)}`);
  }
  if (!ct.includes('application/json')) {
    throw new Error(`Expected JSON but got "${ct}" @ ${url}\n${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

// =======================
// 스타일
// =======================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  scrollContent: {
    flex: 1,
    paddingBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 32,
  },
  groupContainer: {
    marginBottom: 32,
  },
  groupTitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 12,
    fontWeight: '500',
  },
  memberButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedMemberButton: {
    backgroundColor: '#e8d5ff',
    borderColor: '#7c4dff',
  },
  memberText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedMemberText: {
    color: '#7c4dff',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#7c4dff',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    margin: 10,
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    fontSize: 14,
    color: '#c62828',
    fontWeight: '500',
  },
});

// =======================
// 메인 컴포넌트
// =======================
const MyPage2: React.FC = () => {
  const navigation = useNavigation<MyPage2NavigationProp>();
  const route = useRoute<MyPage2RouteProp>();
  const { user } = route.params;

  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // 참여 정보 조회 + 그룹 구성
  const fetchUserTeams = async () => {
    try {
      setIsLoading(true);
      setError('');

      // 1) 참여 정보
      const partUrl = `${API_BASE_URL}/api/participations/user/${user.id}`;
      const partJson = await fetchJson(partUrl);

      const participations = Array.isArray(partJson?.participations)
        ? partJson.participations
        : Array.isArray(partJson?.data?.participations)
        ? partJson.data.participations
        : [];

      if (participations.length === 0) {
        setTeamGroups([]);
        return;
      }

      const groups: TeamGroup[] = [];
      const addedTeams = new Set<number>();

      // 2) 팀별 정보
      for (const p of participations) {
        const teamId: number = p.team_id;
        if (!teamId || addedTeams.has(teamId)) continue;
        addedTeams.add(teamId);

        // 팀 정보 조회: team_name 사용
        let teamTitle = `활동 ${teamId}`;
        try {
          const teamJson = await fetchJson(`${API_BASE_URL}/api/teams/${teamId}`);
          teamTitle =
            teamJson?.team?.team_name ||
            teamJson?.team?.title ||
            teamTitle;
        } catch {
          // 타이틀 조회 실패 시 fallback으로 진행
        }

        // 동료 id 목록 파싱
        let memberIds: number[] = [];
        if (Array.isArray(p.participated_with)) {
          memberIds = p.participated_with;
        } else if (typeof p.participated_with === 'string') {
          try {
            memberIds = JSON.parse(p.participated_with);
          } catch {
            memberIds = [];
          }
        }
        // 자기 자신 제외
        memberIds = memberIds.filter((id: number) => id !== user.id);

        if (memberIds.length === 0) {
          continue;
        }

        // 멤버 정보 batch
        const userJson = await fetchJson(`${API_BASE_URL}/api/users/batch`, {
          method: 'POST',
          body: JSON.stringify({ user_ids: memberIds }),
        });

        const userArray =
          userJson?.users ||
          userJson?.data?.users ||
          [];

        if (!Array.isArray(userArray) || userArray.length === 0) {
          continue;
        }

        const members: TeamMember[] = userArray.map((m: any) => ({
          id: m.id ?? m.user_id,
          name: m.name || '이름 없음',
          department: m.department || '소속 미정',
          selected: false,
        }));

        groups.push({ id: teamId, title: teamTitle, members });
      }

      setTeamGroups(groups);
    } catch (err: any) {
      console.error('fetchUserTeams 오류:', err);
      setError(err?.message || '데이터를 불러오는 중 오류 발생');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchUserTeams();
  }, [user?.id]);

  // 팀원 선택 / 확인
  const handleMemberSelect = (groupId: number, memberId: number) => {
    setTeamGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {
              ...g,
              members: g.members.map(m => ({
                ...m,
                selected: m.id === memberId,
              })),
            }
          : {
              ...g,
              members: g.members.map(m => ({ ...m, selected: false })),
            }
      )
    );
  };

  const handleConfirm = () => {
    const selected = teamGroups.flatMap(g =>
      g.members
        .filter(m => m.selected)
        .map(m => ({
          ...m,
          team_id: g.id,
          activity_title: g.title,
        }))
    );

    if (selected.length === 0) {
      Alert.alert('알림', '평가할 팀원을 선택해주세요.');
      return;
    }

    navigation.navigate('MyPage3', { user, selectedMember: selected[0] });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>팀원평가</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>평가하실 팀원을 선택해 주세요</Text>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchUserTeams}>
              <Text style={[styles.errorText, { textDecorationLine: 'underline' }]}>
                다시 시도
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {isLoading ? (
            <View style={{ paddingVertical: 24 }}>
              <Text style={{ textAlign: 'center', color: '#666', fontSize: 16 }}>
                활동 정보를 불러오는 중...
              </Text>
            </View>
          ) : teamGroups.length > 0 ? (
            teamGroups.map(group => (
              <View key={group.id} style={styles.groupContainer}>
                <Text style={styles.groupTitle}>{group.title}</Text>

                {group.members.map(member => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.memberButton,
                      member.selected && styles.selectedMemberButton,
                    ]}
                    onPress={() => handleMemberSelect(group.id, member.id)}
                  >
                    <Text
                      style={[
                        styles.memberText,
                        member.selected && styles.selectedMemberText,
                      ]}
                    >
                      {member.department} {member.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                참여한 활동이 없거나 평가할 팀원이 없습니다.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {teamGroups.length > 0 && (
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>확인</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default MyPage2;