import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Platform } from 'react-native';

type PortfolioItem = {
  portfolio_id: number;
  title: string;
  category: string;
  duration: string;
  activity_status: string;
};

const PortfolioListScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);

  const userId = 3; // ✅ 로그인된 사용자 ID로 교체

    const API_BASE_URL =
    Platform.OS === 'ios'
      ? 'http://localhost:3000' // iOS 시뮬레이터
      : 'http://10.0.2.2:3000'; // Android 에뮬레이터

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/miniportfolios/${userId}`)
      .then(res => res.json())
      .then(data => {
        setPortfolios(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('데이터 로드 오류:', err);
        setLoading(false);
      });
  }, []);

  const renderItem = ({ item }: { item: PortfolioItem }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>
          {item.category} | {item.duration}
        </Text>
        <Text style={styles.status}>
          {item.activity_status === 'COMPLETED' ? '활동 종료' : '모집 중'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('PortfolioScreen', { portfolioId: item.portfolio_id })}
      >
        <Text style={styles.buttonText}>포트폴리오</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 100 }} />;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>지난 활동</Text>
      <FlatList
        data={portfolios}
        renderItem={renderItem}
        keyExtractor={(item) => item.portfolio_id.toString()}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
  header: { fontSize: 20, fontWeight: 'bold', marginVertical: 20 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { color: '#6B7280', marginBottom: 6 },
  status: { color: '#9CA3AF', fontSize: 13 },
  button: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});

export default PortfolioListScreen;
