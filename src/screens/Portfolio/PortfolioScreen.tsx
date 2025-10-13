import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

import InAppBrowser from 'react-native-inappbrowser-reborn';

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
  fetch(`${API_BASE_URL}/api/miniportfolios/${portfolioId}`) // 👈 detail 제거
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

  // ✅ PDF 다운로드 함수
 const handleDownloadPDF = async () => {
  try {
    if (Platform.OS === 'android') {
      let permission;

      if (Platform.Version >= 34) {
        // ✅ Android 14 이상 (PDF는 documents 권한 필요)
        permission = await PermissionsAndroid.request(
  'android.permission.READ_MEDIA_DOCUMENTS' as any, // 타입 캐스팅 수정
  {
    title: '파일 접근 권한 요청',
    message: 'PDF 파일을 다운로드하려면 문서 접근 권한이 필요합니다.',
    buttonPositive: '허용',
  }
);
      } else if (Platform.Version >= 33) {
        // ✅ Android 13
        permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES, // 일부 제조사에선 이것도 필요
          {
            title: '파일 접근 권한 요청',
            message: 'PDF를 다운로드하려면 파일 접근 권한이 필요합니다.',
            buttonPositive: '허용',
          }
        );
      } else {
        // ✅ Android 12 이하
        permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: '저장소 접근 권한 요청',
            message: 'PDF를 다운로드하려면 저장소 접근 권한이 필요합니다.',
            buttonPositive: '허용',
          }
        );
      }

      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('권한 거부됨', '파일 다운로드 권한이 필요합니다.');
        return;
      }
    }

    // ✅ 파일 경로 설정
    const pdfUrl = `${API_BASE_URL}/api/miniportfolios/${portfolioId}/pdf`;
    const filePath =
      Platform.OS === 'android'
        ? `${RNFS.DownloadDirectoryPath}/portfolio_${portfolioId}.pdf`
        : `${RNFS.DocumentDirectoryPath}/portfolio_${portfolioId}.pdf`;

    console.log('📂 저장 경로:', filePath);

    // ✅ 다운로드 실행
    const result = await RNFS.downloadFile({
      fromUrl: pdfUrl,
      toFile: filePath,
    }).promise;

    if (result.statusCode !== 200) {
      throw new Error(`서버 오류: ${result.statusCode}`);
    }

    console.log('✅ PDF 다운로드 완료:', filePath);

    // ✅ Share 실행 (URI 형식 구분)
    const fileUri =
      Platform.OS === 'android' ? `file://${filePath}` : filePath;

    await Share.open({
      url: fileUri,
      type: 'application/pdf',
      failOnCancel: false,
    });
  } catch (err) {
    console.error('📛 PDF 다운로드 오류:', err);
    Alert.alert('오류', 'PDF 다운로드 중 문제가 발생했습니다.');
  }
};


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

        {/* ✅ PDF 다운로드 버튼 */}
        <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadPDF}>
          <Text style={styles.downloadButtonText}>📄 PDF 다운로드</Text>
        </TouchableOpacity>
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
  downloadButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  downloadButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default PortfolioScreen;
