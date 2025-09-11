import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  Modal,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Platform } from 'react-native';

const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'     // Android 에뮬레이터
    : 'http://localhost:3000';   // iOS 시뮬레이터 (실기기는 http://<맥IP>:3000)

interface User {
  user_id: number;
  email: string;
  name: string;
  department?: string;
  student_number?: string;
  birth_date?: string;
  profile_picture?: string;
}

interface MyPageProps {
  user: User;
  onLogout: () => void;
  onUpdateUser?: (updatedUser: User) => void;
  onNavigateToSetting?: () => void;
  onNavigateToEvaluation?: () => void; // 나의 평가 페이지로 이동하는 함수
  onNavigateToTeamEvaluation?: () => void; // 팀원평가 페이지로 이동하는 함수 추가
}

const MyPage = ({ user, onLogout, onUpdateUser, onNavigateToSetting, onNavigateToEvaluation, onNavigateToTeamEvaluation }: MyPageProps) => {
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [profileImage, setProfileImage] = useState<string | null>(user.profile_picture || null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 사용자 정보 불러오기
  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/user/${user.user_id}`);
      const data = await response.json();
      
      if (data.success && data.user) {
        setCurrentUser(data.user);
        setProfileImage(data.user.profile_picture || null);
        
        if (onUpdateUser) {
          onUpdateUser(data.user);
        }
      } else {
        console.error('사용자 정보 불러오기 실패:', data.message);
        Alert.alert('오류', '사용자 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 정보 불러오기 에러:', error);
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // 프로필 사진 선택
  const handleImagePicker = () => {
    Alert.alert(
      '프로필 사진 변경',
      '어떤 방식으로 프로필 사진을 변경하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '랜덤 이미지',
          onPress: () => {
            const randomId = Math.floor(Math.random() * 1000);
            setProfileImage(`https://picsum.photos/300/300?random=${randomId}`);
          },
        },
        {
          text: '기본 이미지',
          onPress: () => {
            setProfileImage('https://via.placeholder.com/120x120/8B5CF6/FFFFFF?text=USER');
          },
        },
      ]
    );
  };

  // 편집 시작
  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || '');
    setIsSubmitting(false);
  };

  // 편집 완료
  const finishEditing = () => {
    if (editingField && editValue.trim()) {
      setIsSubmitting(true);
      
      const updatedUser = {
        ...currentUser,
        [editingField]: editValue.trim(),
      };
      
      setCurrentUser(updatedUser);
      
      // 서버에 업데이트 요청
      updateUserInfo(editingField, editValue.trim());
      
      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }
    }
    
    setEditingField(null);
    setEditValue('');
    setIsSubmitting(false);
  };

  // 편집 취소
  const cancelEditing = () => {
    if (isSubmitting) return;
    
    setEditingField(null);
    setEditValue('');
  };

  // 사용자 정보 업데이트 API
  const updateUserInfo = async (field: string, value: string) => {
    try {
      const url = `${API_BASE_URL}/api/user/${currentUser.user_id}`;
      const body = { [field]: value };
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('성공', '정보가 업데이트되었습니다.');
        // 업데이트 후 사용자 정보 다시 불러오기
        await fetchUserData();
      } else {
        console.error('업데이트 실패:', data.message || '알 수 없는 오류');
        Alert.alert('오류', data.message || '정보 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('업데이트 API 오류:', error);
      Alert.alert('오류', `서버 연결에 실패했습니다. 상세 정보: ${error}`);
    }
  };

  // 로그아웃 처리
  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '로그아웃',
          onPress: () => {
            console.log('로그아웃 실행');
            onLogout();
          },
          style: 'destructive',
        },
      ]
    );
  };

  // 설정 화면으로 이동
  const handleNavigateToSetting = () => {
    if (onNavigateToSetting) {
      console.log('설정 화면으로 이동');
      onNavigateToSetting();
    } else {
      console.log('설정 화면 이동 함수가 제공되지 않았습니다.');
    }
  };

  // 나의 평가 화면으로 이동
  const handleNavigateToEvaluation = () => {
    if (onNavigateToEvaluation) {
      console.log('나의 평가 화면으로 이동');
      onNavigateToEvaluation();
    } else {
      console.log('나의 평가 화면 이동 함수가 제공되지 않았습니다.');
    }
  };

  // 팀원평가 화면으로 이동
  const handleNavigateToTeamEvaluation = () => {
    if (onNavigateToTeamEvaluation) {
      console.log('팀원평가 화면으로 이동');
      onNavigateToTeamEvaluation();
    } else {
      console.log('팀원평가 화면 이동 함수가 제공되지 않았습니다.');
    }
  };

  // 사용자 정보 섹션 렌더링
  const renderInfoSection = () => {
    return (
      <View style={styles.infoSectionContainer}>
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>이메일</Text>
            <View style={styles.infoValueContainer}>
              <Text style={styles.infoValue}>{currentUser.email}</Text>
              <TouchableOpacity
                style={styles.editIconButton}
                onPress={() => startEditing('email', currentUser.email)}
              >
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>학과</Text>
            <View style={styles.infoValueContainer}>
              <Text style={styles.infoValue}>
                {currentUser.department || '정보 없음'}
              </Text>
              <TouchableOpacity
                style={styles.editIconButton}
                onPress={() => startEditing('department', currentUser.department || '')}
              >
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>학번</Text>
            <View style={styles.infoValueContainer}>
              <Text style={styles.infoValue}>
                {currentUser.student_number || '정보 없음'}
              </Text>
              <TouchableOpacity
                style={styles.editIconButton}
                onPress={() => startEditing('student_number', currentUser.student_number || '')}
              >
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>생년월일</Text>
            <View style={styles.infoValueContainer}>
              <Text style={styles.infoValue}>
                {currentUser.birth_date || '정보 없음'}
              </Text>
              <TouchableOpacity
                style={styles.editIconButton}
                onPress={() => startEditing('birth_date', currentUser.birth_date || '')}
              >
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 로딩 화면
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>사용자 정보를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* 프로필 이미지 섹션 */}
      <View style={styles.profileSection}>
        <View style={styles.profileImageContainer}>
          <Image
            source={
              profileImage 
                ? { uri: profileImage }
                : { uri: 'https://via.placeholder.com/300/E5E7EB/9CA3AF?text=Profile' }
            }
            style={styles.profileImage}
          />
        </View>
        
        <View style={styles.nameContainer}>
          <Text style={styles.userName}>{currentUser.name}</Text>
          <TouchableOpacity style={styles.imageEditButton} onPress={handleImagePicker}>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 탭 네비게이션 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={styles.tab} onPress={handleNavigateToEvaluation}>
          <View style={styles.tabIconContainer}>
            <Text style={styles.tabIcon}>🏠</Text>
          </View>
          <Text style={styles.tabText}>나의 평가</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, styles.activeTab]} onPress={handleNavigateToTeamEvaluation}>
          <View style={styles.tabIconContainer}>
            <Text style={styles.tabIcon}>👤</Text>
          </View>
          <Text style={[styles.tabText, styles.activeTabText]}>팀원평가</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tab}
          onPress={handleNavigateToSetting}
        >
          <View style={styles.tabIconContainer}>
            <Text style={styles.tabIcon}>⚙️</Text>
          </View>
          <Text style={styles.tabText}>설정</Text>
        </TouchableOpacity>
      </View>

      {/* 사용자 정보 섹션 */}
      {renderInfoSection()}

      {/* 하단 네비게이션 */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navText}>홈</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>📖</Text>
          <Text style={styles.navText}>정보</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>✏️</Text>
          <Text style={styles.navText}>활동</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🎓</Text>
          <Text style={styles.navText}>혜택</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={[styles.navText, styles.activeNavText]}>마이페이지</Text>
        </TouchableOpacity>
      </View>

      {/* 편집 모달 */}
      {editingField && (
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContainer}>
            <Text style={styles.editModalTitle}>
              {editingField === 'email' ? '이메일' : 
               editingField === 'department' ? '학과' :
               editingField === 'student_number' ? '학번' : '생년월일'} 편집
            </Text>
            
            <TextInput
              style={styles.editModalInput}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              placeholder={editingField === 'birth_date' ? 'YYYY-MM-DD 형식으로 입력' : '정보를 입력하세요'}
              onSubmitEditing={() => {
                setIsSubmitting(true);
                finishEditing();
              }}
            />
            
            <View style={styles.editModalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={finishEditing}>
                <Text style={styles.saveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileImageContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    marginBottom: 10,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 10,
  },
  imageEditButton: {
    padding: 5,
  },
  editIcon: {
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 5,
    flex: 1,
  },
  tabIconContainer: {
    marginBottom: 3,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#8B5CF6',
  },
  tabIcon: {
    fontSize: 20,
  },
  tabText: {
    fontSize: 12,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  infoSectionContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  infoCard: {
    width: 300,
    backgroundColor: '#F2F4F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  infoValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 5,
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  editIconButton: {
    padding: 5,
  },
  logoutButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  editModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
    textAlign: 'center',
  },
  editModalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 14,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomNavigation: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  activeNavItem: {},
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navText: {
    fontSize: 12,
    color: '#6B7280',
  },
  activeNavText: {
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
});

export default MyPage;
