// src/screens/Portfolio/PortfolioListScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext'; // ✅ 사용자 정보

const API_BASE_URL =
  Platform.OS === 'ios' ? 'http://localhost:3000' : 'http://10.0.2.2:3000';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type MiniPortfolio = {
  portfolio_id: number;
  title: string;          // 서버: t.team_name AS title
  category?: string;
  meeting_type?: string;
  duration?: string;      // 서버: tr.activity_period AS duration
  activity_status?: string;
};

export default function PortfolioListScreen() {
  const [portfolios, setPortfolios] = useState<MiniPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth(); // ✅ 로그인 유저 (예: { id, name, ... })
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      Alert.alert('로그인이 필요합니다', '포트폴리오를 보려면 로그인하세요.');
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        const url = `${API_BASE_URL}/api/users/${userId}/miniportfolios`; // ✅ 목록 라우트
        const res = await fetch(url, { signal: ac.signal });

        if (!res.ok) {
          if (res.status === 404) {
            // 서버가 비어있을 때 404를 줄 수 있으니 빈 목록 처리
            setPortfolios([]);
            return;
          }
          const text = await res.text();
          throw new Error(`서버 오류 ${res.status}: ${text}`);
        }

        const data: MiniPortfolio[] = await res.json();
        setPortfolios(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('🚨 포트폴리오 목록 로드 오류:', err);
          Alert.alert('오류', '서버에서 데이터를 불러올 수 없습니다.');
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [userId]);

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color="#8B5CF6"
        style={{ marginTop: 100 }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.heading}>내 포트폴리오</Text>

        {portfolios.length === 0 ? (
          <Text style={styles.empty}>포트폴리오가 없습니다.</Text>
        ) : (
          portfolios.map((p) => (
            <Pressable
              key={p.portfolio_id}
              style={styles.item}
              onPress={() => {
                console.log('✅ 포트폴리오 클릭:', p.portfolio_id);
                navigation.navigate('PortfolioScreen', {
                  portfolioId: p.portfolio_id, // ✅ 서버 키에 맞춤
                });
              }}
            >
              <Text style={styles.title}>{p.title}</Text>
              <Text style={styles.subtitle}>
                {p.duration ?? '기간 정보 없음'}
                {p.category ? `  |  ${p.category}` : ''}
                {p.meeting_type ? `  |  ${p.meeting_type}` : ''}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  empty: { textAlign: 'center', marginTop: 20, color: '#6B7280' },
  item: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
});