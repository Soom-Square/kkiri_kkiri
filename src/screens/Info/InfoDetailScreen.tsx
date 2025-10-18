import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Platform } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import axios from 'axios';

const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const getImageUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (Platform.OS === 'android') {
    return url.replace('localhost', '10.0.2.2');
  }
  return url;
};


const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('ko-KR');
};

const ActivityDetailScreen = () => {
  const route = useRoute<RouteProp<{ params: { id: number } }, 'params'>>();
  const { id } = route.params;

  const [activity, setActivity] = useState<any>(null);

  useEffect(() => {
    const fetchActivityDetail = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/activities/${id}`);
        setActivity(res.data);
      } catch (error) {
        console.error('활동 상세 조회 오류:', error);
      }
    };

    fetchActivityDetail();
  }, [id]);

  if (!activity) return <Text style={{ padding: 20 }}>로딩 중...</Text>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{activity.title}</Text>

      {activity.main_image_url && (
        <Image source={{ uri: getImageUrl(activity.main_image_url) }} style={styles.image} />
      )}

      <View style={styles.infoContainer}>
        <InfoRow label="모집대상" value={activity.target_audience} />
        <InfoRow label="주최" value={activity.organizer} />
        <InfoRow label="장소" value={activity.location} />
        <InfoRow
          label="운영기간"
          value={`${formatDate(activity.operation_period_start)} ~ ${formatDate(activity.operation_period_end)}`}
        />
        <InfoRow
          label="신청기간"
          value={`${formatDate(activity.application_period_start)} ~ ${formatDate(activity.application_period_end)}`}
        />
        <InfoRow label="문의" value={activity.contact} />
        <InfoRow label="다드림포인트" value={`${activity.points?.toLocaleString()}P`} />

        <Text style={styles.sectionTitle}>세부 내용</Text>
        <Text style={styles.detailsText}>{activity.details}</Text>
      </View>
    </ScrollView>
  );
};

// 라벨:값 한 줄로 구성
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Text style={styles.rowText}>
    <Text style={styles.boldLabel}>{label}: </Text>
    {value}
  </Text>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#101828',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#eee',
  },
  infoContainer: {
    marginBottom: 24,
  },
  rowText: {
    fontSize: 14,
    color: '#101828',
    marginBottom: 6,
    lineHeight: 20,
  },
  boldLabel: {
    fontWeight: 'bold',
    color: '#101828',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#344054',
    marginTop: 12,
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 14,
    color: '#101828',
    lineHeight: 22,
  },
});

export default ActivityDetailScreen;