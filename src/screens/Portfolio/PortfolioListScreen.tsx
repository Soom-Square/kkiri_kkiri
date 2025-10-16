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

const API_BASE_URL =
  Platform.OS === 'ios' ? 'http://localhost:3000' : 'http://10.0.2.2:3000';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PortfolioListScreen() {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/miniportfolios`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`서버 오류 ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log('✅ 포트폴리오 목록:', data);
        setPortfolios(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('🚨 포트폴리오 목록 로드 오류:', err);
        setLoading(false);
        Alert.alert('오류', '서버에서 데이터를 불러올 수 없습니다.');
      });
  }, []);

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
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#6B7280' }}>
            포트폴리오가 없습니다.
          </Text>
        ) : (
          portfolios.map((p) => (
            <Pressable
              key={p.id}
              style={styles.item}
              onPress={() => {
                console.log('✅ 포트폴리오 클릭:', p.id);
                navigation.navigate('PortfolioScreen', {
                  portfolioId: p.id,
                });
              }}
            >
              <Text style={styles.title}>{p.team_name}</Text>
              <Text style={styles.subtitle}>{p.period}</Text>
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
  item: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#6B7280' },
});
