import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

type ParamList = {
  Evaluation: { user: { id: number; name?: string; department?: string; profile_picture?: string } };
};

type EvaluationRoute = RouteProp<ParamList, 'Evaluation'>;

type Summary = { review_low: number; review_medium: number; review_high: number };
type Review = {
  review_id: number;
  reviewer_id: number;
  reviewee_id: number;
  related_team_id: number;
  review_high: number;
  review_medium: number;
  review_low: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
};

const ICON_FROWN = require('../assets/face-frown.png');
const ICON_HAPPY = require('../assets/face-happy.png');
const ICON_SMILE = require('../assets/face-smile.png');

const EvaluationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EvaluationRoute>();
  const { user } = route.params;

  const [summary, setSummary] = useState<Summary>({ review_low: 0, review_medium: 0, review_high: 0 });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const r = await fetch(`${BASE_URL}/api/user/${user.id}/evaluations`);
      const data = await r.json();
      setSummary({
        review_low: Number(data?.evaluations?.review_low || 0),
        review_medium: Number(data?.evaluations?.review_medium || 0),
        review_high: Number(data?.evaluations?.review_high || 0),
      });
    } catch (e) {
      console.log('평가 요약 오류', e);
    }
  };

  const fetchReviews = async () => {
    try {
      // 디버그 API에서 가져온 뒤 클라이언트에서 필터
      const r = await fetch(`${BASE_URL}/api/reviews/debug`);
      const data = await r.json();
      const mine = (data?.reviews || []).filter((rv: Review) => Number(rv.reviewee_id) === Number(user.id));
      setReviews(mine);
    } catch (e) {
      console.log('받은 리뷰 목록 오류', e);
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchReviews()]);
      if (mounted) setLoading(false);
    };
    run();
    return () => {
      mounted = false;
    };
  }, [user.id]);

  const EvalBox = ({ icon, label, count }: { icon: any; label: string; count: number }) => (
    <View style={styles.evalItem}>
      <Image source={icon} style={styles.evalIcon} />
      <Text style={styles.evalLabel}>{label}</Text>
      <Text style={styles.evalCount}>{count}개</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingBox}><Text style={styles.loadingText}>불러오는 중...</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* 상단 요약 */}
          <View style={styles.summaryRow}>
            <EvalBox icon={ICON_FROWN} label="별로예요" count={summary.review_low} />
            <EvalBox icon={ICON_HAPPY} label="좋아요!" count={summary.review_medium} />
            <EvalBox icon={ICON_SMILE} label="최고예요" count={summary.review_high} />
          </View>

          <View style={styles.hr} />

          {/* 받은 평가 코멘트 */}
          <Text style={styles.sectionTitle}>받은 평가 코멘트</Text>
          {reviews.length === 0 ? (
            <View style={styles.emptyBox}><Text style={styles.emptyText}>아직 받은 평가 코멘트가 없습니다.</Text></View>
          ) : (
            reviews.map(rv => {
              let type = '';
              let icon: any = null;
              if (rv.review_high === 1) { type = '최고예요'; icon = ICON_SMILE; }
              else if (rv.review_medium === 1) { type = '좋아요'; icon = ICON_HAPPY; }
              else if (rv.review_low === 1) { type = '별로예요'; icon = ICON_FROWN; }

              return (
                <View key={rv.review_id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewType}>
                      <Image source={icon} style={styles.reviewTypeIcon} />
                      <Text style={styles.reviewTypeText}>{type}</Text>
                    </View>
                  </View>
                  <Text style={styles.comment}>"{rv.comment || '코멘트가 없습니다.'}"</Text>
                  <View style={styles.reviewFooter}>
                    <Text style={styles.date}>{new Date(rv.created_at).toLocaleDateString('ko-KR')}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default EvaluationScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  back: { padding: 6 },
  backText: { fontSize: 22, fontWeight: '700', color: '#000' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },

  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20,
  },
  evalItem: { alignItems: 'center' },
  evalIcon: { width: 48, height: 48, resizeMode: 'contain', marginBottom: 8 },
  evalLabel: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  evalCount: { fontSize: 18, fontWeight: '800', color: '#333' },

  hr: { height: 1, backgroundColor: '#eee', marginVertical: 16 },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#101828', marginBottom: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 36 },
  emptyText: { color: '#999', fontSize: 15 },

  reviewCard: {
    backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#7c4dff',
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewType: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewTypeIcon: { width: 20, height: 20, resizeMode: 'contain' },
  reviewTypeText: { color: '#7c4dff', fontWeight: '600' },
  comment: { fontSize: 15, color: '#333', lineHeight: 22, marginTop: 8, marginBottom: 12, fontStyle: 'italic' },
  reviewFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewer: { fontSize: 12, color: '#666' },
  date: { fontSize: 12, color: '#999' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#666', fontSize: 16 },
});