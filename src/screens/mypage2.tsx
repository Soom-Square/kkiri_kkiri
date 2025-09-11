import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Platform } from 'react-native';

const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'     // Android 에뮬레이터
    : 'http://localhost:3000';   // iOS 시뮬레이터 (실기기: http://192.168.x.x:3000)
interface User {
  id: number;
  email: string;
  name: string;
  department?: string;
  student_number?: string;
  birth?: string;
  profile_picture?: string;
}

// 네비게이션 타입 정의
type RootStackParamList = {
  MyPage2: { 
    user: {
      id: number;
      email: string;
      name: string;
      department?: string;
      student_number?: string;
      birth?: string;
      profile_picture?: string;
    };
  };
  MyPage3: { 
    user: {
      id: number;
      email: string;
      name: string;
      department?: string;
      student_number?: string;
      birth?: string;
      profile_picture?: string;
    };
    selectedMember: {
      id: number;
      name: string;
      department: string;
      activity_id: number;
      activity_title: string;
    };
  };
};

type MyPage2NavigationProp = StackNavigationProp<RootStackParamList, 'MyPage2'>;
type MyPage2RouteProp = RouteProp<RootStackParamList, 'MyPage2'>;

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

interface ActivityParticipation {
  participation_id: number;
  activity_id: number;
  activity_title?: string;
  participated_with: number[];
}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  debugContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    margin: 10,
    borderRadius: 5,
    maxHeight: 200,
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    lineHeight: 14,
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

const MyPage2: React.FC = () => {
  const navigation = useNavigation<MyPage2NavigationProp>();
  const route = useRoute<MyPage2RouteProp>();
  const { user } = route.params;

  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [error, setError] = useState<string>('');

  // API에서 사용자의 활동 참여 정보 가져오기
  const fetchUserActivities = async () => {
    try {
      setIsLoading(true);
      setError('');
      setDebugInfo(`사용자 ID: ${user.id}로 활동 정보 조회 시작`);
      
      // 1. 사용자의 참여 정보 가져오기
      const participationResponse = await fetch(
        `${API_BASE_URL}/api/participations/user/${user.id}`
      );
      
      if (!participationResponse.ok) {
        throw new Error(`참여 정보 조회 실패: ${participationResponse.status}`);
      }
      
      const participationData = await participationResponse.json();
      
      setDebugInfo(prev => prev + `\n참여 정보 조회 성공: ${participationData.participations?.length || 0}개 활동`);
      
      if (!participationData.success || !participationData.participations || participationData.participations.length === 0) {
        setDebugInfo(prev => prev + '\n참여한 활동이 없습니다.');
        setTeamGroups([]);
        return;
      }

      const groups: TeamGroup[] = [];
      const addedActivities = new Set<number>(); // 중복 방지용

      // 2. 각 참여 활동에 대해 처리
      for (const participation of participationData.participations) {
        try {
          // 이미 추가된 활동인지 확인
          if (addedActivities.has(participation.activity_id)) {
            setDebugInfo(prev => prev + `\n활동 ${participation.activity_id} 이미 처리됨, 건너뜀`);
            continue;
          }

          setDebugInfo(prev => prev + `\n활동 ${participation.activity_id} 처리 중...`);
          
          // 활동 정보 가져오기
          const activityResponse = await fetch(
            `${API_BASE_URL}/api/activities/${participation.activity_id}`
          );
          
          if (!activityResponse.ok) {
            setDebugInfo(prev => prev + `\n활동 ${participation.activity_id} 정보 조회 실패`);
            continue;
          }
          
          const activityData = await activityResponse.json();
          const activityTitle = activityData.success && activityData.activity ? 
            activityData.activity.title : `활동 ${participation.activity_id}`;
          
          // participated_with에서 본인 제외
          let participatedWith: number[] = [];
          
          try {
            if (Array.isArray(participation.participated_with)) {
              participatedWith = participation.participated_with;
            } else if (typeof participation.participated_with === 'string') {
              participatedWith = JSON.parse(participation.participated_with);
            } else {
              setDebugInfo(prev => prev + `\n활동 ${participation.activity_id}: participated_with 형식 오류`);
              continue;
            }
          } catch (parseError) {
            setDebugInfo(prev => prev + `\n활동 ${participation.activity_id}: JSON 파싱 오류`);
            continue;
          }
          
          // 본인 ID를 숫자로 변환하여 제외
          const memberIds = participatedWith.filter(id => Number(id) !== Number(user.id));
          
          setDebugInfo(prev => prev + `\n활동 ${participation.activity_id}: 팀원 ${memberIds.length}명 발견`);
          
          if (memberIds.length > 0) {
            // 멤버 정보 가져오기
            const membersResponse = await fetch(`${API_BASE_URL}/api/users/batch`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ user_ids: memberIds }),
            });
            
            if (!membersResponse.ok) {
              setDebugInfo(prev => prev + `\n활동 ${participation.activity_id}: 멤버 정보 조회 실패`);
              continue;
            }
            
            const membersData = await membersResponse.json();
            
             if (membersData.success && membersData.users && Array.isArray(membersData.users)) {
              // ✅ 수정: 서버에서 이제 id 필드로 직접 반환하므로 member.id 사용
              const members = membersData.users.map((member: any) => ({
                id: member.id,  // ✅ member.user_id → member.id로 변경
                name: member.name || '이름 없음',
                department: member.department || '소속 미정',
                selected: false
            }));
              console.log('변환된 멤버 데이터:', members);

              if (members.length > 0) {
                groups.push({
                  id: participation.activity_id,
                  title: activityTitle,
                  members: members
                });
                
                addedActivities.add(participation.activity_id); // 추가된 활동 기록
                setDebugInfo(prev => prev + `\n활동 "${activityTitle}": ${members.length}명 추가`);
              }
            } else {
              setDebugInfo(prev => prev + `\n활동 ${participation.activity_id}: 멤버 데이터 형식 오류`);
            }
          }
        } catch (activityError) {
          console.error(`활동 ${participation.activity_id} 처리 중 오류:`, activityError);
          setDebugInfo(prev => prev + `\n활동 ${participation.activity_id} 오류: ${activityError instanceof Error ? activityError.message : '알 수 없는 오류'}`);
        }
      }
      
      setTeamGroups(groups);
      setDebugInfo(prev => prev + `\n최종 결과: ${groups.length}개 활동, ${groups.reduce((sum, g) => sum + g.members.length, 0)}명 팀원`);
      
    } catch (error) {
      console.error('활동 정보 가져오기 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
      setError(errorMessage);
      setDebugInfo(prev => prev + `\n전체 오류: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.id) {
      fetchUserActivities();
    } else {
      setError('사용자 정보가 올바르지 않습니다');
      setIsLoading(false);
    }
  }, [user.id]);

const handleMemberSelect = (groupId: number, memberId: number) => {
  setTeamGroups(prevGroups => {
    // 먼저 모든 선택을 해제
    const clearedGroups = prevGroups.map(group => ({
      ...group,
      members: group.members.map(member => ({
        ...member,
        selected: false
      }))
    }));
    
    // 그 다음 클릭된 멤버만 선택
    return clearedGroups.map(group => 
      group.id === groupId 
        ? {
            ...group,
            members: group.members.map(member => 
              member.id === memberId 
                ? { ...member, selected: true } // 클릭된 멤버만 선택
                : member
            )
          }
        : group
    );
  });
};

  const handleConfirm = () => {
    console.log('handleConfirm 함수 호출됨');
    
    const selectedMembers = teamGroups.flatMap(group => 
      group.members.filter(member => member.selected).map(member => ({
        ...member,
        activity_id: group.id,
        activity_title: group.title
      }))
    );
    
    console.log('선택된 멤버들:', selectedMembers);
    
    if (selectedMembers.length > 0) {
      const selectedMember = selectedMembers[0];
      console.log('최종 선택된 멤버:', selectedMember);
      
      // MyPage3으로 이동
      navigation.navigate('MyPage3', {
        user,
        selectedMember
      });
    } else {
      console.log('선택된 멤버가 없음');
      Alert.alert('알림', '평가할 팀원을 선택해주세요.');
    }
  };

  const handleRetry = () => {
    fetchUserActivities();
  };

  const renderTeamGroup = (group: TeamGroup) => (
    <View key={group.id} style={styles.groupContainer}>
      <Text style={styles.groupTitle}>{group.title}</Text>
      
      {group.members.map((member) => (
        <TouchableOpacity
          key={member.id}
          style={[
            styles.memberButton,
            member.selected && styles.selectedMemberButton
          ]}
          onPress={() => handleMemberSelect(group.id, member.id)}
        >
          <Text style={[
            styles.memberText,
            member.selected && styles.selectedMemberText
          ]}>
            {member.department} {member.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>팀원평가</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>활동 정보를 불러오는 중...</Text>
        </View>
        {debugInfo ? (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>{debugInfo}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

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
        
        {/* 에러 메시지 표시 */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={handleRetry} style={{ marginTop: 10 }}>
              <Text style={[styles.errorText, { textDecorationLine: 'underline' }]}>
                다시 시도
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        
        <ScrollView 
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }} // 확인 버튼 공간 확보
        >
          {teamGroups.length > 0 ? (
            teamGroups.map(renderTeamGroup)
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {error ? '오류가 발생했습니다' : '참여한 활동이 없거나 평가할 팀원이 없습니다.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* 확인 버튼 - 고정 위치 */}
      {teamGroups.length > 0 && (
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>확인</Text>
        </TouchableOpacity>
      )}

      
    </SafeAreaView>
  );
};

export default MyPage2;