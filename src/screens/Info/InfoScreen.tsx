// src/screens/Info/InfoScreen.tsx
import React, { useEffect, useState } from 'react';
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
import CommonHeader from '../../components/CommonHeader';

const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

const categories = ['공모전', '세미나', '워크숍', '특강', '튜터링', '다드림'];

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('ko-KR');
};

const InfoScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [searchText, setSearchText] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchText, selectedCategories, activities]);

  const fetchActivities = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/activities`);
      setActivities(res.data);
    } catch (error) {
      console.error('활동 불러오기 오류:', error);
    }
  };

  const applyFilters = () => {
    let filtered = activities;

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((item) => selectedCategories.includes(item.category));
    }

    if (searchText.trim()) {
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredActivities(filtered);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader bottomSpace={14} /> 
      <View style={styles.searchContainer}>
        <Image
          source={require('../../assets/search-md.png')}
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
          {categories.map((cat) => (
            <View key={cat} style={styles.checkboxItem}>
              <TouchableOpacity
                onPress={() => toggleCategory(cat)}
                style={styles.checkboxCircle}
              >
                {selectedCategories.includes(cat) && (
                  <View style={styles.checkboxInner} />
                )}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>{cat}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 활동 리스트 */}
      <ScrollView>
        {filteredActivities.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.activityItem}
            onPress={() => navigation.navigate('InfoDetail', { id: item.activity_id } as never)}
          >
            <Text style={styles.activityTitle}>{item.title}</Text>
            <Text style={styles.activityText}>
              신청: {formatDate(item.application_period_start)} ~ {formatDate(item.application_period_end)}
            </Text>
            <Text style={styles.activityText}>
              운영: {formatDate(item.operation_period_start)} ~ {formatDate(item.operation_period_end)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexBasis: '45%',
    marginVertical: 6,
  },
  activityItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  activityTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  activityText: {
    fontSize: 14,
    color: '#555',
  },
  checkboxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  checkboxItemSelected: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7A5AF8',
  },
  checkboxSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D0D5DD',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  checkboxSquareSelected: {
    backgroundColor: '#7A5AF8',
    borderColor: '#7A5AF8',
  },
  filterBox: {
    backgroundColor: '#F9F5FF',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 20,
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
  checkboxCircle: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#344054',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: '#344054',
    borderRadius: 2,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#101828',
    fontWeight: '600',
  },
});

export default InfoScreen;