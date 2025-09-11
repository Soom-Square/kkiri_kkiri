// MatchingScreen.tsx
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
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';

import { useFocusEffect } from '@react-navigation/native';


const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

// 디자인 시안의 카테고리
const categories = ['공모전', '비교과', '경진대회', '동아리', '소모임', '기타'];

type Recruitment = {
  recruitment_id: number;
  team_id?: number;
  post_name: string;            // 제목
  activity_type: string;           // 공모전/비교과/...
  qualification_department?: string;
  qualification_student_number?: string;
  qualification_age?: number;
  required_members: number;        // 필요 인원(정원)
  activity_period?: string;        // "8주" 등 사람이 읽는 기간 텍스트
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
  status?: string; // 'pending' | 'approved' | 'rejected' 등일 수 있음
  created_at?: string;
};

const MatchingScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [searchText, setSearchText] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  const { user } = useAuth();

  const fetchAll = async () => {
    try {
      const [rRes, aRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/team-recruitments`),          // 또는 with-count
        axios.get(`${BASE_URL}/api/applications`),
      ]);
      setRecruitments(rRes.data || []);
      setApplications(aRes.data || []);
    } catch (e) {
      console.error('매칭 데이터 불러오기 오류:', e);
    }
  };

  // 최초 1회
  useEffect(() => {
    fetchAll();
  }, []);

  // 화면에 다시 포커스될 때마다 새로고침
  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );
  // ---- 데이터 불러오기 ----
  useEffect(() => {
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
    fetchAll();
  }, []);

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
      {/* 상단 로고 + 알림 */}
      <View style={styles.header}>
        <Text style={styles.logo}>끼리끼리</Text>
        <Icon
          name="notifications-outline"
          size={24}
          color="#101828"
          onPress={() => navigation.navigate('Notification')}
        />
      </View>

      {/* 검색창 */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color="#667085" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="검색어를 입력하세요"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#667085"
          style={styles.searchInput}
        />
      </View>

      {/* 카테고리 체크박스 (시안처럼 보라배경 박스) */}
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
      <ScrollView>
        {filtered.map((r) => {
          const current = headcountsByRecruitment.get(r.recruitment_id) || 0;
          return (
            <TouchableOpacity
              key={r.recruitment_id}
              style={styles.item}
              // 상세 페이지가 있다면 아래 라우트 이름만 바꿔서 사용하세요.
              onPress={() => navigation.navigate('MatchingDetail', { id: r.recruitment_id })}
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

        {/* 하단 “팀 만들기” 버튼 */}
        <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 24 }}>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('TeamMake', { user })}  // ← user.id 포함
            activeOpacity={0.85}
          >
            <Text style={styles.createBtnText}>팀 만들기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7A5AF8',
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
  createBtn: {
    minWidth: 140,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#7A5AF8',
  },
  createBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default MatchingScreen;