import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, Image, Alert, ScrollView, Platform
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';

// ImageAsset 타입 정의
interface ImageAsset {
  uri: string;
  type?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

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

  // URL 처리 함수 - localhost를 현재 플랫폼에 맞게 변환
  const getCorrectImageUrl = (imageUrl: string | null | undefined): string | null => {
    if (!imageUrl) return null;
    
    // localhost를 현재 플랫폼에 맞는 주소로 변경
    if (Platform.OS === 'android') {
      return imageUrl.replace('http://localhost:3000', 'http://10.0.2.2:3000');
    } else {
      // iOS는 localhost 그대로 사용
      return imageUrl.replace('http://10.0.2.2:3000', 'http://localhost:3000');
    }
  };

  // 사용자 정보 불러오기 (전역 user가 있을 때만)
  const fetchUserData = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/${user.id}`);
      const data = await res.json();
      if (data.success && data.user) {
        console.log('받아온 프로필 사진 원본:', data.user.profile_picture);
        
        // URL을 플랫폼에 맞게 변환
        const correctedUrl = getCorrectImageUrl(data.user.profile_picture);
        console.log('변환된 프로필 사진 URL:', correctedUrl);
        
        setUser(data.user);
        setProfileImage(correctedUrl);
      } else {
        Alert.alert('오류', data.message || '사용자 정보를 불러오는데 실패했습니다.');
      }
    } catch (e) {
      console.error('사용자 데이터 fetch 에러:', e);
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user?.id]);

  // 프로필 이미지 동기화
  useEffect(() => {
    if (user?.profile_picture) {
      const correctedUrl = getCorrectImageUrl(user.profile_picture);
      setProfileImage(correctedUrl);
    }
  }, [user?.profile_picture]);

  // 프로필 사진 업로드 함수
  const updateProfilePicture = async (imageAsset: ImageAsset): Promise<void> => {
    if (!user) return;
    
    try {
      const formData = new FormData();
      
      formData.append('image', {
        uri: imageAsset.uri,
        type: imageAsset.type || 'image/jpeg',
        name: imageAsset.fileName || `profile-${user.id}-${Date.now()}.jpg`,
      } as any);

      const uploadUrl = `${API_BASE_URL}/api/upload/profile/${user.id}`;
      
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (data.success) {
        // 서버에서 받은 URL을 플랫폼에 맞게 변환
        const correctedUrl = getCorrectImageUrl(data.imageUrl);
        console.log('업로드 후 변환된 URL:', correctedUrl);
        
        setProfileImage(correctedUrl);
        await fetchUserData();
        Alert.alert('성공', '프로필 사진이 업데이트되었습니다.');
      } else {
        throw new Error(data.message || '프로필 사진 업데이트에 실패했습니다.');
      }
    } catch (e) {
      console.error('이미지 업로드 오류:', e);
      Alert.alert(
        '오류', 
        e instanceof Error ? e.message : '이미지 업로드 중 서버 오류가 발생했습니다.'
      );
    }
  };

  const handleImagePicker = () => {
    Alert.alert('프로필 사진 변경', '어떤 방식으로 변경하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '갤러리에서 선택',
        onPress: () => {
          launchImageLibrary({ 
            mediaType: 'photo' as MediaType,
            quality: 0.8,
            maxWidth: 200,
            maxHeight: 200,
          }, async (response: ImagePickerResponse) => {
            if (response.didCancel) {
              console.log('User cancelled image picker');
            } else if (response.errorCode) {
              console.error('ImagePicker Error: ', response.errorMessage);
              Alert.alert('오류', '갤러리 접근 권한이 없거나 오류가 발생했습니다.');
            } else if (response.assets && response.assets.length > 0) {
              const selectedImage = response.assets[0];
              if (selectedImage.uri) {
                await updateProfilePicture({
                  uri: selectedImage.uri,
                  type: selectedImage.type,
                  fileName: selectedImage.fileName,
                  fileSize: selectedImage.fileSize,
                  width: selectedImage.width,
                  height: selectedImage.height,
                });
              }
            }
          });
        },
      },
      {
        text: '기본 이미지로 변경',
        onPress: async () => {
          await updateProfilePictureToDefault();
        },
      },
    ]);
  };

  // 기본 이미지로 변경하는 함수
  const updateProfilePictureToDefault = async () => {
    if (!user?.id) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profile_picture: null
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setProfileImage(null);
        await fetchUserData();
        Alert.alert('성공', '프로필 사진이 기본 이미지로 변경되었습니다.');
      } else {
        Alert.alert('오류', data.message || '프로필 사진 변경에 실패했습니다.');
      }
    } catch (e) {
      console.error('기본 이미지 설정 오류:', e);
      Alert.alert('오류', '서버 오류가 발생했습니다.');
    }
  };

  const toDateOnly = (iso?: string) => {
    if (!iso) return '';
    return iso.split('T')[0];
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
          setUser(null);
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
    
    const userForNavigation = {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department || '',
      student_number: user.studentId || '',
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
    
    const userForNavigation = {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department || '',
      student_number: user.studentId || '',
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
              onError={(error) => {
                console.log('이미지 로드 실패 상세 정보:', {
                  url: profileImage,
                  error: error.nativeEvent.error,
                  platform: Platform.OS
                });
                // 에러 발생 시 다시 URL 변환 시도
                if (profileImage && profileImage.includes('localhost')) {
                  const retryUrl = getCorrectImageUrl(profileImage);
                  console.log('재시도 URL:', retryUrl);
                  if (retryUrl !== profileImage) {
                    setProfileImage(retryUrl);
                  }
                }
              }}
              onLoad={() => {
                console.log('이미지 로드 성공:', profileImage);
              }}
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
              ['학번', 'studentId'],
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
                studentId: '학번',
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
  profileImageContainer: { width: 130, height: 130, borderRadius: 60, overflow: 'hidden', marginTop:50, marginBottom: 10 },
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
  logoutButtonWrapper: {
    width: 300,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop:4,
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
    paddingHorizontal: 30,
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