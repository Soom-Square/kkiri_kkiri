import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, Image, Alert, ScrollView, Platform
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { launchImageLibrary } from 'react-native-image-picker';

// RootStackParamList 타입 정의 (App.tsx와 동일하게)
type RootStackParamList = {
  Login: undefined;
  Settings: { user: User };
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
    selectedMember?: {
      id: number;
      name: string;
      department: string;
      activity_id: number;
      activity_title: string;
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
  MyPage4: { 
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
};

type NavProp = StackNavigationProp<RootStackParamList>;

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const formatDate = (value?: string) => {
  if (!value) return '정보 없음';
  // 이미 yyyy-MM-dd면 그대로
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const d = new Date(value);               // 서버가 주는 ISO를 Date로 파싱
  if (isNaN(d.getTime())) return value;    // 혹시 모를 예외
  const y = d.getFullYear();               // 로컬 기준 (getUTC* 아님)
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function MyPageScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, setUser } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<keyof User | null>(null);
  const [editValue, setEditValue] = useState('');

  // 사용자 정보 불러오기 (전역 user가 있을 때만)
  const fetchUserData = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/${user.id}`);
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user); // 전역 갱신
        setProfileImage(data.user.profile_picture || null);
      } else {
        Alert.alert('오류', data.message || '사용자 정보를 불러오는데 실패했습니다.');
      }
    } catch (e) {
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user?.id]);

 const handleImagePicker = () => {
    Alert.alert('프로필 사진 변경', '어떤 방식으로 변경하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '갤러리에서 선택',
        onPress: () => {
          launchImageLibrary({ mediaType: 'photo' }, async (response) => {
            if (response.didCancel) {
              console.log('User cancelled image picker');
            } else if (response.errorCode) {
              Alert.alert('오류', '갤러리 접근 권한이 없거나 오류가 발생했습니다.');
            } else if (response.assets && response.assets.length > 0) {
              const selectedImage = response.assets[0];
              if (selectedImage.uri) {
                // ✅ 서버에 이미지 업로드 및 프로필 업데이트
                await updateProfilePicture(selectedImage.uri);
              }
            }
          });
        },
      },
      {
        text: '기본 이미지로 변경', // ✅ 버튼 텍스트 변경
        onPress: () => {
          setProfileImage('https://via.placeholder.com/120x120/8B5CF6/FFFFFF?text=USER');
          // TODO: 기본 이미지로 변경하는 API 호출 로직 추가
        },
      },
    ]);
  };

  // ✅ 추가: 선택된 이미지를 서버에 업로드하고 사용자 정보 갱신
  const updateProfilePicture = async (imageUri: string) => {
    if (!user) return;
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg', // 혹은 파일의 mime 타입에 맞게 변경
        name: `profile-${user.id}-${Date.now()}.jpg`,
      });

      const uploadUrl = `${API_BASE_URL}/api/upload/profile/${user.id}`;
      
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await res.json();
      if (data.success) {
        Alert.alert('성공', '프로필 사진이 업데이트되었습니다.');
        // ✅ 성공 시 사용자 정보를 다시 불러와서 화면을 갱신합니다.
        await fetchUserData();
      } else {
        Alert.alert('오류', data.message || '프로필 사진 업데이트에 실패했습니다.');
      }
    } catch (e) {
      console.error('이미지 업로드 오류:', e);
      Alert.alert('오류', '이미지 업로드 중 서버 오류가 발생했습니다.');
    }
  };


  const toDateOnly = (iso?: string) => {
    if (!iso) return '';
    return iso.split('T')[0];            // "2000-11-10"
  };

  const isDateOnly = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

  const startEditing = (field: keyof User, value?: string) => {
    setEditingField(field);
    if (field === 'birth') setEditValue(formatDate(value));
    else setEditValue(value ?? '');
  };

  const finishEditing = () => {
    if (!editingField || !user) return;
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingField(null);
      setEditValue('');
      return;
    }

    if (editingField === 'birth') {
      if (!isDateOnly(trimmed)) {
        Alert.alert('형식 오류', '생년월일은 YYYY-MM-DD 형식으로 입력하세요.');
        return;
      }
      updateUserInfo(editingField, trimmed);
      return;
    }

    updateUserInfo(editingField, trimmed);
  };

  const updateUserInfo = async (field: keyof User, value: string) => {
    if (!user?.id) return;
    try {
      const url = `${API_BASE_URL}/api/user/${user.id}`;
      
      // API 호출시 필드명을 데이터베이스 컬럼명으로 변환
      const dbField = field === 'studentId' ? 'student_number' : field;
      
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [dbField]: value }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('성공', '정보가 업데이트되었습니다.');
        await fetchUserData();
      } else {
        Alert.alert('오류', data.message || '업데이트 실패');
      }
    } catch (e) {
      Alert.alert('오류', '서버 오류가 발생했습니다.');
    } finally {
      setEditingField(null);
      setEditValue('');
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          setUser(null); // 전역 초기화
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          );
        },
      },
    ]);
  };

  // 나의평가 페이지로 이동
  const navigateToMyEvaluation = () => {
    if (!user) {
      Alert.alert('오류', '사용자 정보를 불러올 수 없습니다.');
      return;
    }
    
    // User 타입을 맞춰서 전달
    const userForNavigation = {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department || '',
      student_number: user.studentId || '', // studentId를 student_number로 매핑
      birth: user.birth || '',
      profile_picture: user.profile_picture || ''
    };
    
    navigation.navigate('MyPage4', { user: userForNavigation });
  };

  // 팀원평가 페이지로 이동
  const navigateToTeamEvaluation = () => {
    if (!user) {
      Alert.alert('오류', '사용자 정보를 불러올 수 없습니다.');
      return;
    }
    
    // User 타입을 맞춰서 전달
    const userForNavigation = {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department || '',
      student_number: user.studentId || '', // studentId를 student_number로 매핑
      birth: user.birth || '',
      profile_picture: user.profile_picture || ''
    };
    
    navigation.navigate('MyPage2', { user: userForNavigation });
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로그인이 필요합니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView>
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
            <Text style={styles.userName}>{user.name}</Text>
            <TouchableOpacity style={styles.imageEditButton} onPress={handleImagePicker}>
              <Image source={require('../assets/pencil-01.png')}/>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={styles.tab} onPress={navigateToMyEvaluation}>
            <View style={styles.tabIconContainer}>
              <Image source={require('../assets/eval.png')} style={styles.tabIcon} />
            </View>
            <Text style={styles.tabText}>나의 평가</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tab} onPress={navigateToTeamEvaluation}>
            <View style={styles.tabIconContainer}>
              <Image source={require('../assets/team.png')} style={styles.tabIcon} />
            </View>
            <Text style={styles.tabText}>팀원평가</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => navigation.navigate('Settings', { user })}
          >
            <View style={styles.tabIconContainer}>
              <Image source={require('../assets/settings.png')} style={styles.tabIcon} />
            </View>
            <Text style={styles.tabText}>설정</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSectionContainer}>
          <View style={styles.infoCard}>
            {([
              ['이메일', 'email'],
              ['학과', 'department'],
              ['학번', 'studentId'], // studentId로 변경 (AuthContext User 타입과 일치)
              ['생년월일', 'birth'],
            ] as const).map(([label, field]) => (
              <View key={field} style={styles.infoItem}>
                <Text style={styles.infoLabel}>{label}</Text>
                <View style={styles.infoValueContainer}>
                  <Text style={styles.infoValue}>
                    {field === 'birth'
                      ? formatDate(user.birth)
                      : (user[field] as string) || '정보 없음'}
                  </Text>
                  <TouchableOpacity
                    style={styles.editIconButton}
                    onPress={() => startEditing(field, user[field] as string | undefined)}
                  >
                    <Image source={require('../assets/pencil-01.png')}/>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
          {/* 변경된 부분: logoutButton을 감싸는 View 추가 */}
          <View style={styles.logoutButtonWrapper}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {editingField && (
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContainer}>
            <Text style={styles.editModalTitle}>
              {{
                email: '이메일',
                department: '학과',
                studentId: '학번', // studentId로 변경
                birth: '생년월일',
                id: 'ID',
                name: '이름',
                profile_picture: '프로필',
              }[editingField]}{' '}
              편집
            </Text>
            <TextInput
              style={styles.editModalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder="정보를 입력하세요"
              onSubmitEditing={finishEditing}
            />
            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditingField(null);
                  setEditValue('');
                }}
              >
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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B7280' },
  profileSection: { alignItems: 'center', paddingVertical: 20 },
  profileImageContainer: { width: 180, height: 180, borderRadius: 90, overflow: 'hidden', marginBottom: 10 },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginRight: 10 },
  imageEditButton: { padding: 5 },
  editIcon: { fontSize: 16 },
  infoSectionContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 20 },
  infoCard: { width: 300, backgroundColor: '#F2F4F8', borderRadius: 12, padding: 20 },
  infoItem: { marginBottom: 15 },
  infoLabel: { fontSize: 14, color: '#6B7280', marginBottom: 5 },
  infoValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 5,
  },
  infoValue: { flex: 1, fontSize: 16, color: '#1F2937' },
  editIconButton: { padding: 5 },
  // 변경된 부분: 새로운 스타일 객체 추가
  logoutButtonWrapper: {
    width: 300, // infoCard와 너비를 동일하게 맞춤
    flexDirection: 'row',
    justifyContent: 'flex-end', // 로그아웃 버튼을 오른쪽으로 정렬
    marginTop:4, // 카드와의 간격
  },
  logoutButton: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  logoutText: { color: '#98A2B3', fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
  editModalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  editModalContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, width: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
  },
  editModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  editModalInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, padding: 10, fontSize: 16, marginBottom: 15 },
  editModalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelButton: { paddingHorizontal: 15, paddingVertical: 8, marginRight: 10 },
  saveButton: { backgroundColor: '#8B5CF6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  cancelText: { color: '#6B7280', fontSize: 14 },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },

  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    //paddingVertical: 10,
    paddingHorizontal: 30,
    //marginTop: 2,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
  },

  tabIconContainer: {
    marginBottom: 4,
    alignItems: 'center',
  },

  tabIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },

  tabText: {
    fontSize: 12,
    color: '#6B7280',
  },
});