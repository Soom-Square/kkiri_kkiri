import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const getCorrectImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) return null;
  
  if (Platform.OS === 'android') {
    return imageUrl.replace('http://localhost:3000', 'http://10.0.2.2:3000');
  } else {
    return imageUrl.replace('http://10.0.2.2:3000', 'http://localhost:3000');
  }
};

const ICON_FROWN = require('../assets/face-frown.png');
const ICON_HAPPY = require('../assets/face-happy.png');
const ICON_SMILE = require('../assets/face-smile.png');

type RootStackParamList = {
  RecruitDetail: { id: number };
  Evaluation: { user: { id: number; name?: string; department?: string; profile_picture?: string } };
};

type Recruitment = {
  recruitment_id: number;
  owner_user_id: number;
  activity_name: string;
  activity_type: string;
  activity_period?: string;
  meeting_type?: string;
  required_members: number;
  memo?: string;
  created_at?: string;
};

type EvaluationSummary = {
  review_low: number;
  review_medium: number;
  review_high: number;
  total_reviews?: number;
};

type Application = {
  application_id: number;
  recruitment_id: number;
  applicant_id: number;
  memo?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
  created_at: string;
  applicant?: {
    id: number;
    name: string;
    department?: string;
    profile_picture?: string;
  };
  evaluations?: EvaluationSummary;
};

type RouteProps = RouteProp<RootStackParamList, 'RecruitDetail'>;

const MatchingDetailScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProps>();
  const { user: me } = useAuth();

  const [recruit, setRecruit] = useState<Recruitment | null>(null);
  const [owner, setOwner] = useState<any>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [intro, setIntro] = useState('');
  const [loading, setLoading] = useState(false);

  const isOwner = useMemo(
    () => recruit && me?.id && recruit.owner_user_id === me.id,
    [recruit, me?.id]
  );

  const fetchDetail = async () => {
    try {
      const r = await axios.get(`${BASE_URL}/api/team-recruitments/${route.params.id}`);
      setRecruit(r.data);

      const u = await axios.get(`${BASE_URL}/api/user/${r.data.owner_user_id}`);
      setOwner(u.data.user);

      const a = await axios.get(`${BASE_URL}/api/team-recruitments/${route.params.id}/applications`);
      const list: Application[] = a.data || [];

      const enriched = await Promise.all(
        list.map(async (ap: Application) => {
          let applicant = ap.applicant;
          if (!applicant) {
            try {
              const ures = await axios.get(`${BASE_URL}/api/user/${ap.applicant_id}`);
              applicant = ures.data.user;
            } catch {}
          }
          let evaluations: EvaluationSummary | undefined;
          try {
            const ev = await axios.get(`${BASE_URL}/api/user/${ap.applicant_id}/evaluations`);
            evaluations = ev.data?.evaluations ?? { review_low: 0, review_medium: 0, review_high: 0 };
          } catch {
            evaluations = { review_low: 0, review_medium: 0, review_high: 0 };
          }
          return { ...ap, applicant, evaluations };
        })
      );

      setApps(enriched);
    } catch (e) {
      console.error('상세 조회 오류:', e);
      Alert.alert('오류', '상세 정보를 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [route.params.id]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [route.params.id])
  );

  const alreadyApplied = useMemo(() => {
    if (!me?.id) return false;
    return apps.some(a => a.applicant_id === me.id && a.status !== 'REJECTED' && a.status !== 'CANCELED');
  }, [apps, me?.id]);

  const currentCount = useMemo(() => {
    return apps.reduce((acc, a) => acc + (a.status === 'REJECTED' || a.status === 'CANCELED' ? 0 : 1), 0);
  }, [apps]);

  const handleApply = async () => {
    if (!me?.id) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }
    if (alreadyApplied) {
      Alert.alert('알림', '이미 신청한 모집글입니다.');
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${BASE_URL}/api/applications`, {
        recruitment_id: route.params.id,
        applicant_id: me.id,
        memo: intro,
        status: 'PENDING',
      });
      Alert.alert('완료', '지원이 등록되었습니다.');
      setIntro('');
      fetchDetail();
    } catch (e) {
      console.error('지원 오류:', e);
      Alert.alert('오류', '지원에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ 개선된 승인/반려 처리 (팀 생성 안내 포함)
  const updateAppStatus = async (application_id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      setLoading(true);
      const res = await axios.put(`${BASE_URL}/api/applications/${application_id}/status`, { status });

      if (status === 'APPROVED') {
        if (res.data.team_id) {
          Alert.alert('팀 생성 완료', '팀이 생성되었으며 공지사항 게시판이 자동으로 추가되었습니다.');
        } else if (res.data.message?.includes('팀 생성')) {
          Alert.alert('팀 생성 완료', '팀이 생성되었으며 공지사항 게시판이 자동으로 추가되었습니다.');
        } else {
          Alert.alert('승인 완료', res.data.message || '신청이 승인되었습니다.');
        }
      } else {
        Alert.alert('반려 완료', '신청이 반려되었습니다.');
      }

      await fetchDetail();
    } catch (e) {
      console.error('상태 변경 오류:', e);
      Alert.alert('오류', '상태 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const goToEvaluation = (user: { id: number; name?: string; department?: string; profile_picture?: string }) => {
    navigation.navigate('Evaluation', { user });
  };

  if (!recruit) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24, paddingTop: 16 }}>
        <Text style={styles.title}>{recruit.activity_name}</Text>

        <View style={styles.metaRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              goToEvaluation({
                id: owner?.id ?? recruit.owner_user_id,
                name: owner?.name,
                department: owner?.department,
                profile_picture: owner?.profile_picture,
              })
            }
            style={{ marginRight: 12 }}
          >
            {(() => {
              const profileUri = getCorrectImageUrl(owner?.profile_picture);
              return (
                <Image
                  source={{ uri: profileUri || 'https://via.placeholder.com/56' }}
                  style={styles.avatar}
                />
              );
            })()}

          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                goToEvaluation({
                  id: owner?.id ?? recruit.owner_user_id,
                  name: owner?.name,
                  department: owner?.department,
                  profile_picture: owner?.profile_picture,
                })
              }
            >
              <Text style={styles.ownerName}>{owner?.name || '작성자'}</Text>
            </TouchableOpacity>
            <Text style={styles.ownerSub}>{timeAgo(recruit.created_at)} 전</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.badge}>
              {recruit.activity_type || '-'} | {recruit.meeting_type || '-'} | {recruit.activity_period || '-'}
            </Text>
            <Text style={styles.headcount}>인원 : [{currentCount}/{recruit.required_members}]</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {recruit.memo ? (
          <Text style={styles.body}>{recruit.memo}</Text>
        ) : (
          <Text style={styles.body}>상세 설명이 없습니다.</Text>
        )}

        {!isOwner && (
          <>
            <View style={styles.inputBox}>
              <TextInput
                placeholder="본인에 대해 알려주세요"
                placeholderTextColor="#98A2B3"
                value={intro}
                onChangeText={setIntro}
                style={styles.input}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, (alreadyApplied || loading) && { opacity: 0.6 }]}
              onPress={handleApply}
              disabled={alreadyApplied || loading}
            >
              <Text style={styles.primaryBtnText}>
                {alreadyApplied ? '이미 지원함' : '지원하기'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {isOwner && (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            {apps.filter(a => a.status === 'PENDING').length === 0 ? (
              <Text style={{ color: '#475467' }}>아직 신청자가 없습니다.</Text>
            ) : (
              apps
                .filter(a => a.status === 'PENDING')
                .map((a) => {
                  const ev = a.evaluations || { review_low: 0, review_medium: 0, review_high: 0 };
                  return (
                    <View key={a.application_id} style={styles.appCard}>
                      <View style={styles.appTopRow}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() =>
                            goToEvaluation({
                              id: a.applicant?.id ?? a.applicant_id,
                              name: a.applicant?.name,
                              department: a.applicant?.department,
                              profile_picture: a.applicant?.profile_picture,
                            })
                          }
                          style={{ flex: 1 }}
                        >
                          <Text style={styles.appTitle}>
                            {(a.applicant?.department ? `${a.applicant.department} ` : '') +
                              (a.applicant?.name || `user#${a.applicant_id}`)}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.evalWrap}>
                          <View style={styles.evalItem}>
                            <Text style={styles.evalNum}>{ev.review_low || 0}</Text>
                            <Image source={ICON_FROWN} style={styles.evalIcon} />
                          </View>
                          <View style={styles.evalItem}>
                            <Text style={styles.evalNum}>{ev.review_medium || 0}</Text>
                            <Image source={ICON_HAPPY} style={styles.evalIcon} />
                          </View>
                          <View style={styles.evalItem}>
                            <Text style={styles.evalNum}>{ev.review_high || 0}</Text>
                            <Image source={ICON_SMILE} style={styles.evalIcon} />
                          </View>
                        </View>
                      </View>

                      <Text style={styles.appSub}>{timeAgo(a.created_at)} 전 · 상태: 대기</Text>

                      {a.memo ? <Text style={styles.appMemo}>{a.memo}</Text> : null}

                      <View style={styles.appButtons}>
                        <TouchableOpacity
                          style={[styles.smallBtn, styles.acceptBtn, loading && { opacity: 0.6 }]}
                          onPress={() => updateAppStatus(a.application_id, 'APPROVED')}
                          disabled={loading}
                        >
                          <Text style={[styles.smallBtnText, styles.acceptText]}>수락</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.smallBtn, styles.rejectBtn, loading && { opacity: 0.6 }]}
                          onPress={() => updateAppStatus(a.application_id, 'REJECTED')}
                          disabled={loading}
                        >
                          <Text style={styles.smallBtnText}>반려</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MatchingDetailScreen;

function timeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간`;
  const d = Math.floor(h / 24);
  return `${d}일`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', color: '#101828', paddingHorizontal: 16, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12, backgroundColor: '#E5E7EB' },
  ownerName: { fontSize: 16, fontWeight: '700', color: '#101828' },
  ownerSub: { fontSize: 13, color: '#667085', marginTop: 2 },
  badge: { fontSize: 13, color: '#475467' },
  headcount: { fontSize: 13, color: '#475467', marginTop: 6 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16, marginHorizontal: 16 },
  body: { color: '#101828', fontSize: 15, paddingHorizontal: 16, lineHeight: 22 },
  inputBox: {
    backgroundColor: '#F2F4F7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    marginHorizontal: 16, marginTop: 20, height: 140,
  },
  input: { flex: 1, fontSize: 15, color: '#101828', textAlignVertical: 'top' },
  primaryBtn: {
    marginHorizontal: 16, marginTop: 14, backgroundColor: '#7A5AF8',
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  appCard: { backgroundColor: '#F3F4F6', borderRadius: 18, padding: 14, marginBottom: 12 },
  appTopRow: { flexDirection: 'row', alignItems: 'center' },
  appTitle: { fontSize: 14, color: '#101828', fontWeight: '800', flex: 1 },
  appSub: { fontSize: 12, color: '#667085', marginTop: 4 },
  appMemo: { marginTop: 8, color: '#101828', fontSize: 14, lineHeight: 20 },
  evalWrap: { flexDirection: 'row', alignItems: 'center' },
  evalItem: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  evalNum: { fontSize: 13, color: '#101828', marginRight: 6, fontWeight: '700' },
  evalIcon: { width: 18, height: 18, resizeMode: 'contain' },
  appButtons: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 10 },
  smallBtn: { minWidth: 90, alignItems: 'center', paddingVertical: 8, borderRadius: 12 },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  acceptBtn: { backgroundColor: '#E9D7FE' },
  acceptText: { color: '#7A5AF8', fontWeight: '800' },
  rejectBtn: { backgroundColor: '#D1D5DB' },
});
