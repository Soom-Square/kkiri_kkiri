// src/screens/Portfolio/PortfolioScreen.tsx

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types';

const API_BASE_URL =
  Platform.OS === 'ios'
    ? 'http://localhost:3000'
    : 'http://10.0.2.2:3000';

type PortfolioScreenRouteProp = RouteProp<RootStackParamList, 'PortfolioScreen'>;

type MiniPortfolioDetail = {
  portfolio_id: number;
  user_id: number;
  team_id: number;
  team_name: string;
  period: string | null;
  goals: string | null;
  role: string | null;
  category?: string | null;
  meeting_type?: string | null;
  activity_status?: string | null;
};

export default function PortfolioScreen() {
  const route = useRoute<PortfolioScreenRouteProp>();
  const portfolioId = route.params?.portfolioId;

  const [portfolio, setPortfolio] = useState<MiniPortfolioDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!portfolioId) {
      console.error('portfolioId가 없습니다:', route.params);
      Alert.alert('오류', '포트폴리오 ID가 전달되지 않았습니다.');
      setLoading(false);
      return;
    }

    const ac = new AbortController();

    fetch(`${API_BASE_URL}/api/miniportfolios/${portfolioId}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`서버 오류 ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then((data: MiniPortfolioDetail) => {
        setPortfolio(data);
      })
      .catch((err) => {
        console.error('포트폴리오 상세 로드 오류:', err);
        Alert.alert('오류', '서버에서 데이터를 불러올 수 없습니다.');
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [portfolioId, route.params]);

  const goalItems = useMemo(() => {
    if (!portfolio?.goals) return [];
    return portfolio.goals
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [portfolio?.goals]);

  if (loading) {
    return (
      <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 100 }} />
    );
  }

  if (!portfolio) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 100 }}>
          데이터를 불러올 수 없습니다.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>{portfolio.team_name}</Text>

        {/* 주요 정보 블록 */}
        <View style={styles.infoBlock}>
          <Text style={styles.infoText}>
            <Text style={styles.bold}>기간 : </Text>
            {portfolio.period
              ? portfolio.period.replace(/-/g, '.').replace(/ ~ /, '~')
              : '정보 없음'}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.bold}>활동 종류 : </Text>
            {portfolio.category || '정보 없음'}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.bold}>대면 여부 : </Text>
            {portfolio.meeting_type || '정보 없음'}
          </Text>
        </View>

        {/* 역할 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>역할</Text>
          <Text style={styles.text}>{portfolio.role || '역할 정보 없음'}</Text>
        </View>

        {/* 목표 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>목표</Text>
          {goalItems.length > 0 ? (
            <View style={{ gap: 4 }}>
              {goalItems.map((g, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.text}>{g}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.text}>없음</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#111827' },

  infoBlock: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  infoText: { fontSize: 15, color: '#374151', marginBottom: 6 },
  bold: { fontWeight: 'bold', color: '#111827' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#1F2937' },
  text: { fontSize: 15, color: '#374151', lineHeight: 22 },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bullet: { color: '#6B7280', lineHeight: 22 },
});