// src/screens/NotificationScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // ✅ 로그인 유저정보 불러올 때 사용 (이미 프로젝트에 존재)

// 🔹 플랫폼별 API 주소 자동 분기
const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000' // Android 에뮬레이터용
    : 'http://localhost:3000'; // iOS 시뮬레이터용

type Notice = {
  id: string;
  channel: string; // 팀 이름 or '공지'
  title: string;   // 메시지 내용
  time: string;    // "1분 전"
};

// 🔹 상대시간 계산 함수
const timeAgo = (timestamp: string) => {
  const diff = (Date.now() - new Date(timestamp).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

export default function NotificationScreen() {
  const { user } = useAuth(); // ✅ 로그인 유저 (context에서 가져옴)
  const [tab, setTab] = useState<'활동' | '공지'>('활동');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${BASE_URL}/notifications/${user.id}`);
        if (res.data.success) {
          const mapped: Notice[] = res.data.notifications.map((n: any) => ({
            id: String(n.id),
            channel: n.team_name || '공지',
            title: n.message,
            time: timeAgo(n.created_at),
          }));
          setNotices(mapped);
        }
      } catch (err) {
        console.error('알림 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user?.id]);

  // 🔹 탭 필터링
  const filteredData =
    tab === '활동'
      ? notices.filter(n => n.channel !== '공지')
      : notices.filter(n => n.channel === '공지');

  const renderItem = ({ item }: { item: Notice }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.card}
      onPress={() => console.log('👉 알림 클릭됨:', item.id)}
    >
      <View style={styles.cardTop}>
        <Text style={styles.channel}>{item.channel}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#7A5AF8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 탭 */}
      <View style={styles.tabs}>
        <View style={styles.tabBaseLine} />
        {(['활동', '공지'] as const).map(t => {
          const active = tab === t;
          return (
            <TouchableOpacity
              key={t}
              style={styles.tabBtn}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
        <View
          style={[
            styles.tabActiveBar,
            tab === '활동' ? { left: 0 } : { left: '50%' },
          ]}
        />
      </View>

      {/* 알림 목록 */}
      <FlatList
        data={filteredData}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListEmptyComponent={
          <View style={{ padding: 30, alignItems: 'center' }}>
            <Text style={{ color: '#98A2B3' }}>알림이 없습니다.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ✅ 기존 디자인 그대로 유지
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabs: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 4,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 16, color: '#98A2B3' },
  tabTextActive: { color: '#101828', fontWeight: '700' },
  tabBaseLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: '#E4E7EC',
  },
  tabActiveBar: {
    position: 'absolute',
    bottom: 0,
    width: '50%',
    height: 2,
    backgroundColor: '#111111',
    borderRadius: 1,
  },
  card: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 30,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E7EC',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  channel: { fontSize: 12, color: '#98A2B3' },
  time: { fontSize: 12, color: '#98A2B3' },
  title: { fontSize: 15, color: '#101828' },
});
