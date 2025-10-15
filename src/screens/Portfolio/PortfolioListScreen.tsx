import React, { useEffect, useState } from 'react';
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
import { useRoute } from '@react-navigation/native';

const API_BASE_URL =
  Platform.OS === 'ios'
    ? 'http://localhost:3000'
    : 'http://10.0.2.2:3000';

const PortfolioScreen = () => {
  const route = useRoute();
  const { portfolioId } = route.params as { portfolioId: number };

  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/miniportfolios/${portfolioId}`)
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`서버 오류 ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then(data => {
        setPortfolio(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('🚨 포트폴리오 상세 로드 오류:', err);
        setLoading(false);
        Alert.alert('오류', '서버에서 데이터를 불러올 수 없습니다.');
      });
  }, [portfolioId]);

  if (loading)
    return (
      <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 100 }} />
    );

  if (!portfolio)
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 100 }}>
          데이터를 불러올 수 없습니다.
        </Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>{portfolio.team_name}</Text>
        <Text style={styles.period}>기간: {portfolio.period}</Text>
        <Text style={styles.goal}>목표: {portfolio.goals}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>역할분담</Text>
          <Text style={styles.text}>{portfolio.team_roles || '팀 역할 정보 없음'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>활동 과정</Text>
          <Text style={styles.text}>팀의 주요 일정 및 작업 내용이 자동 요약될 예정입니다.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>산출물</Text>
          <Text style={styles.text}>- 전체 목표: {portfolio.goals || '없음'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>수상여부</Text>
          <Text style={styles.text}>추후 수상 내역이 연동될 예정입니다.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: '#111827' },
  period: { color: '#6B7280', marginBottom: 6 },
  goal: { marginBottom: 20, color: '#4B5563' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#1F2937' },
  text: { fontSize: 15, color: '#374151', lineHeight: 22 },
});

export default PortfolioScreen;
