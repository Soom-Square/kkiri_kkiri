import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { User } from '../types';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  InfoDetail: undefined;
  Settings: { user: User };
  Evaluation: undefined;
  TeamFind: undefined;
};

type SettingsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;
type SettingsRouteProp = RouteProp<RootStackParamList, 'Settings'>;

const SettingScreen = () => {
  const route = useRoute<SettingsRouteProp>();
  const navigation = useNavigation<SettingsNavigationProp>();
  const user = route.params?.user;

  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    teamMatching: true,
    todos: true,
    announcements: true,
  });

  const API_BASE_URL =
    Platform.OS === 'android'
      ? 'http://10.0.2.2:3000'
      : 'http://localhost:3000';

  // ✅ 1. 설정 불러오기
  useEffect(() => {
    if (!user?.id) return;
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/user-settings/${user.id}`);
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      } catch (error) {
        console.error('설정 불러오기 오류:', error);
      }
    };
    fetchSettings();
  }, [user]);

  // ✅ 2. 설정 변경 처리
  const toggleSwitch = async (key: keyof typeof settings) => {
    const newValue = !settings[key];
    const newSettings = { ...settings, [key]: newValue };
    setSettings(newSettings);

    try {
      await fetch(`${API_BASE_URL}/api/user-settings/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      console.log(`✅ ${key} 설정이 ${newValue ? '활성화' : '비활성화'}되었습니다`);
    } catch (error) {
      console.error('설정 저장 오류:', error);
      Alert.alert('오류', '설정 저장에 실패했습니다.');
    }
  };

  const onLogout = () => {
    navigation.replace('Login');
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      '회원 탈퇴',
      '정말로 회원 탈퇴하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '탈퇴', onPress: confirmDeleteAccount, style: 'destructive' },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/delete-user/${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setLoading(false);
      if (data.success) {
        Alert.alert('탈퇴 완료', '회원 탈퇴가 완료되었습니다.', [
          { text: '확인', onPress: onLogout },
        ]);
      } else {
        Alert.alert('오류', data.message || '회원 탈퇴 처리 실패');
      }
    } catch (error) {
      setLoading(false);
      console.error('회원 탈퇴 에러:', error);
      Alert.alert('오류', '서버 연결 실패');
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ padding: 20, color: 'gray' }}>사용자 정보를 불러오는 중입니다...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 계정 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>계정</Text>
        <View style={styles.itemContainer}>
          <Text style={styles.itemLabel}>아이디</Text>
          <Text style={styles.itemValue}>{user.email}</Text>
        </View>

        <TouchableOpacity 
          style={styles.itemContainer} 
          onPress={() => navigation.navigate('PasswordResetScreen')}
        >
          <Text style={styles.itemLabel}>비밀번호 변경</Text>
          <Text style={styles.itemArrow}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* 알림 설정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알림</Text>

        {[
          ['팀/팀원 매칭 알림', 'teamMatching'],
          ['활동 할 일 알림', 'todos'],
          ['공지사항 알림', 'announcements'],
        ].map(([label, key]) => (
          <View style={styles.itemContainer} key={key}>
            <Text style={styles.itemLabel}>{label}</Text>
            <Switch
              trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E5E7EB"
              onValueChange={() => toggleSwitch(key as keyof typeof settings)}
              value={settings[key as keyof typeof settings]}
            />
          </View>
        ))}
      </View>

      {/* 회원탈퇴 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>회원탈퇴</Text>
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Text style={styles.deleteAccountText}>회원탈퇴</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  itemLabel: { fontSize: 16, color: '#1F2937' },
  itemValue: { fontSize: 16, color: '#9CA3AF' },
  deleteAccountButton: {
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteAccountText: { fontSize: 16, color: '#EF4444' },
});

export default SettingScreen;
