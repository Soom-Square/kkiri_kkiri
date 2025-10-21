// src/screens/MatchingScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import CommonHeader from '../components/CommonHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

// 디자인 시안의 카테고리
const categories = ['공모전', '비교과', '경진대회', '동아리', '소모임', '기타'];

type Recruitment = {
  recruitment_id: number;
  team_id?: number;
  post_name: string;
  activity_type: string;
  qualification_department?: string;
  qualification_student_number?: string;
  qualification_age?: number;
  required_members: number;
  activity_period?: string;
  meeting_type?: '대면' | '비대면' | '혼합' | string;
  memo?: string;
  status?: string;
  created_at?: string;
};

type Application = {
  application_id: number;
  recruitment_id: number;
  applicant_id: number;
  memo?: string;
  status?: string;
  created_at?: string;
};

const MatchingScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();

  const [searchText, setSearchText] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  const { user } = useAuth();

  const fetchAll = async () => {
    try {
      const [rRes, aRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/team-recruitments`),
        axios.get(`${BASE_URL}/api/applications`),
      ]);
      setRecruitments(rRes.data || []);
      setApplications(aRes.data || []);
    } catch (e) {
      console.error('매칭 데이터 불러오기 오류:', e);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  // ---- 현재 인원 집계 (status가 cancel/rejected가 아닌 것만 카운트) ----
  const headcountsByRecruitment = useMemo(() => {
    const map = new Map<number, number>();
    for (const app of applications) {
      const s = (app.status || '').toLowerCase();
      if (s === 'rejected' || s === 'canceled' || s === 'cancelled') continue;
      map.set(app.recruitment_id, (map.get(app.recruitment_id) || 0) + 1);
    }
    return map;
  }, [applications]);

  // ---- 필터 적용 ----
  const filtered = useMemo(() => {
    let list = [...recruitments];

    if (selectedCategories.length > 0) {
      list = list.filter((r) => selectedCategories.includes(r.activity_type));
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(
        (r) =>
          r.post_name?.toLowerCase().includes(q) ||
          r.memo?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [recruitments, searchText, selectedCategories]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader bottomSpace={14} />

      {/* 본문은 스크롤 가능 */}
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 96, // 고정 버튼 아래로 여백
        }}
      >
        {/* 검색창 */}
        <View style={styles.searchContainer}>
          <Image
            source={require('../assets/search-md.png')}
            style={{ width: 20, height: 20, tintColor: '#667085', marginRight: 8 }}
            resizeMode="contain"
          />
          <TextInput
            placeholder="검색어를 입력하세요"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#667085"
            style={styles.searchInput}
          />
        </View>

        {/* 카테고리 체크박스 */}
        <View style={styles.filterBox}>
          <View style={styles.checkboxGrid}>
            {categories.map((cat) => {
              const selected = selectedCategories.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={styles.checkboxItem}
                  onPress={() => toggleCategory(cat)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkboxSquare,
                      selected && styles.checkboxSquareSelected,
                    ]}
                  />
                  <Text style={styles.checkboxLabel}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 리스트 */}
        {filtered.map((r) => {
          const current = headcountsByRecruitment.get(r.recruitment_id) || 0;
          return (
            <TouchableOpacity
              key={r.recruitment_id}
              style={styles.item}
              onPress={() =>
                navigation.navigate('MatchingDetail', { id: r.recruitment_id } as never)
              }
              activeOpacity={0.8}
            >
              <Text style={styles.itemTitle} numberOfLines={1}>
                {r.post_name}
              </Text>

              <Text style={styles.itemSub} numberOfLines={1}>
                {r.activity_type || '-'} | {r.meeting_type || '-'} | {r.activity_period || '-'}
              </Text>

              <Text style={styles.itemMeta}>
                인원 : [{current}/{r.required_members ?? 0}]
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 하단 고정 “팀 만들기” 버튼 */}
      <View
        pointerEvents="box-none"
        style={[
          styles.fabWrapper,
          { paddingBottom: Math.max(insets.bottom, 8) },
        ]}
      >
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('TeamMake', { user } as never)}
          activeOpacity={0.85}
        >
          <Text style={styles.createBtnText}>팀 만들기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  searchInput: {
    fontSize: 16,
    color: '#101828',
    flex: 1,
  },
  filterBox: {
    backgroundColor: '#F9F5FF',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '30%',
    marginVertical: 18,
    paddingHorizontal: 4,
  },
  checkboxSquare: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#344054',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  checkboxSquareSelected: {
    backgroundColor: '#344054',
    borderColor: '#344054',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#101828',
    fontWeight: '600',
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#101828',
  },
  itemSub: {
    fontSize: 14,
    color: '#475467',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 14,
    color: '#475467',
  },

  // 하단 고정 영역
  fabWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0, // safe-area padding은 위에서 더함
    alignItems: 'center',
  },
  createBtn: {
    minWidth: 160,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: '#7A5AF8',
    // 그림자/입체감
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 6,
      },
    }),
    marginBottom: 8, // 홈 인디케이터와 약간 거리
  },
  createBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default MatchingScreen;