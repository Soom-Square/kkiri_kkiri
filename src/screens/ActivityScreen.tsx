// src/screens/ActivityScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { RootStackParamList } from '../types'; 
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { RouteProp, useRoute } from '@react-navigation/native';

const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'     // Android 에뮬레이터
    : 'http://localhost:3000';   // iOS 시뮬레이터 (실기기: http://<맥IP>:3000)

    
type Nav = NativeStackNavigationProp<RootStackParamList>;

type ActivityOption = {
  teamId: number;
  teamName: string;
  role: 'LEADER' | 'MEMBER' | string;
};

type Props = {
  // 이미 전역에서 currentUser를 Context로 쓰면 prop 필요 없음.
  // 필요하다면 prop 또는 route.params로 넘겨줘.
  currentUserId?: number;
};

const PURPLE = '#7A5AF8';
const INPUT_BG = '#F2F4F7';
const TEXT_HINT = '#667085';
const TEXT_MAIN = '#101828';

export default function ActivityScreen() {
  const { user } = useAuth();  // 로그인된 유저 가져오기
  const currentUserId = user?.id; // id는 User 타입에 맞게 (예: user.user_id 일 수도 있음)

  const navigation = useNavigation<Nav>();

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ActivityOption[]>([]);
  const [selected, setSelected] = useState<ActivityOption | null>(null);

  // 예시: .env 또는 공용 axios 인스턴스가 있다면 그걸 사용해도 됨
  const API_BASE = useMemo(() => API_BASE_URL, []);

  useEffect(() => {
    if (!currentUserId) {
      console.log('⚠️ 로그인된 사용자 없음');
      return;
    }
    console.log('currentUserId =', currentUserId);

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/users/${currentUserId}/teams`);
        const data: ActivityOption[] = await res.json();
        setOptions(data);
        if (data.length > 0) setSelected(data[0]);
      } catch (e) {
        console.warn('활동 목록 불러오기 실패:', e);
      }
    })();
  }, [API_BASE, currentUserId]);

  return (
  <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
    <StatusBar barStyle="dark-content" />
    <View style={[styles.container, { paddingTop: 12 }]}>
      {/* 상단 로고 + 아이콘 */}
      <View style={styles.topRow}>
        <Text style={styles.brand}>끼리끼리</Text>

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

      {/* 여기 아래부터는 다음 단계 UI(진행률 바 등)를 이어서 만들면 됨 */}
      {/* ✅ 플러스 버튼 */}
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
  // role이 'LEADER'/'MEMBER' 같은 영문일 때 한글로 표시
  if (!role) return '';
  const upper = role.toUpperCase();
  if (upper === 'LEADER') return '팀장';
  if (upper === 'MEMBER') return '팀원';
  return role; // 이미 'UI 디자이너' 등 커스텀 역할명이라면 그대로 표기
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
  brand: {
    fontSize: 28,
    fontWeight: '800',
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
    color: '#1F2A37', // 짙은 남색 느낌
  },
    // ✅ 플로팅 액션 버튼 스타일
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5, // Android 그림자
  },
});