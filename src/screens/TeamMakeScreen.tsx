// MakeTeamScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const CATEGORIES = ['공모전', '비교과', '경진대회', '동아리', '소모임', '기타'] as const;

const DEPARTMENTS = ['전학과', '컴퓨터공학과', '디자인학부', '경영학과', '기타'];
const PERIODS = ['4주', '8주', '한 학기', '상시'];
const MEMBERS = ['2', '3', '4', '5', '6', '8', '10', '20'];

type RootStackParamList = {
  MakeTeamScreen: { user?: { id: number; name?: string } } | undefined;
};

type RouteProps = RouteProp<RootStackParamList, 'MakeTeamScreen'>;

const MakeTeamScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProps>();

  // form states
  // const [teamName, setTeamName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);

  const [department, setDepartment] = useState<string>('모집학과');
  const [period, setPeriod] = useState<string>('기간');
  const [members, setMembers] = useState<string>('인원');
  const [meetingType, setMeetingType] = useState<'대면' | '비대면'>('대면');

  const [activityName, setActivityName] = useState('');
  const [conditions, setConditions] = useState('');
  const [postTitle, setPostTitle] = useState('');   // ← 기존 teamName 대체 (글 제목)

  const ownerUserId = useMemo(() => {
    const id = route.params?.user?.id ?? 1; // 로그인 연동 시 user.id 전달 권장
    if (!route.params?.user?.id) console.warn('owner_user_id가 없어 1로 대체했습니다.');
    return id;
  }, [route.params?.user?.id]);

  const validate = () => {
    if (!postTitle.trim()) return Alert.alert('확인', '팀 이름을 입력하세요.');
    if (!selectedCategory) return Alert.alert('확인', '카테고리를 선택하세요.');
    if (!activityName.trim()) return Alert.alert('확인', '활동이름을 입력하세요.');
    if (!DEPARTMENTS.includes(department)) return Alert.alert('확인', '모집학과를 선택하세요.');
    if (!PERIODS.includes(period)) return Alert.alert('확인', '기간을 선택하세요.');
    if (!MEMBERS.includes(members)) return Alert.alert('확인', '인원을 선택하세요.');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const payload = {
        owner_user_id: ownerUserId,
        post_name: postTitle,               // ← 목록/상세 제목으로 사용
        activity_name: activityName,               // 리스트에 보일 제목
        activity_type: selectedCategory,           // 카테고리
        qualification_department: department,      // 모집학과
        qualification_student_number: null,
        qualification_age: null,
        required_members: Number(members),
        activity_period: period,
        meeting_type: meetingType,
        memo: conditions,
        status: 'OPEN',
      };

      await axios.post(`${BASE_URL}/api/team-recruitments`, payload);
      Alert.alert('완료', '모집글이 등록되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      console.error('모집글 등록 실패:', e?.response?.data || e?.message || e);
      Alert.alert('오류', '등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const DropDown = ({
    open,
    setOpen,
    label,
    value,
    items,
    onSelect,
  }: {
    open: boolean;
    setOpen: (b: boolean) => void;
    label: string;
    value: string;
    items: string[];
    onSelect: (val: string) => void;
  }) => {
  const [btnH, setBtnH] = useState(0);

  return (
    // 포지셔닝 기준점
    <View style={[{ flex: 1, marginHorizontal: 6, position: 'relative' }, open && { zIndex: 100 }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.ddButton}
        onLayout={(e) => setBtnH(e.nativeEvent.layout.height)}
        onPress={() => setOpen(!open)}
      >
        <Text style={[styles.ddLabel, value === label && { color: '#667085' }]}>{value}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#101828" />
      </TouchableOpacity>

      {open && (
        <>
          {/* 클로즈용 투명 오버레이 (같은 스크린 안에서 이벤트만 받음) */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />

          {/* 드롭다운 메뉴를 버튼 "아래"에 겹쳐서 띄우기 */}
          <View
            style={[
              styles.ddMenuOverlay,
              { top: btnH + 6 }, // 버튼 높이 + 간격만큼 아래에 표시
            ]}
          >
            {items.map((it) => (
              <TouchableOpacity
                key={it}
                style={styles.ddItem}
                onPress={() => {
                  onSelect(it);
                  setOpen(false);
                }}
              >
                <Text style={styles.ddItemText}>{it}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.inputBox}>
          <TextInput
            value={postTitle}
            onChangeText={setPostTitle}
            placeholder="글 제목"
            placeholderTextColor="#667085"
            style={styles.input}
          />
        </View>

        {/* 카테고리 */}
        <View style={styles.filterBox}>
          <View style={styles.checkboxGrid}>
            {CATEGORIES.map((c) => {
              const selected = selectedCategory === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={styles.checkboxItem}
                  onPress={() => setSelectedCategory(selected ? null : c)}
                >
                  <View style={[styles.checkboxSquare, selected && styles.checkboxSquareSelected]} />
                  <Text style={styles.checkboxLabel}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 드롭다운 3개 */}
        <View style={styles.ddRow}>
          <DropDown
            open={departmentOpen}
            setOpen={setDepartmentOpen}
            label="모집학과"
            value={department}
            items={DEPARTMENTS}
            onSelect={setDepartment}
          />
          <DropDown
            open={periodOpen}
            setOpen={setPeriodOpen}
            label="기간"
            value={period}
            items={PERIODS}
            onSelect={setPeriod}
          />
          <DropDown
            open={memberOpen}
            setOpen={setMemberOpen}
            label="인원"
            value={members}
            items={MEMBERS}
            onSelect={setMembers}
          />
        </View>

        {/* 미팅 방식 토글 */}
        <View style={styles.meetingRow}>
          <TouchableOpacity
            style={[styles.meetingBtn, meetingType === '대면' && styles.meetingBtnActive]}
            onPress={() => setMeetingType('대면')}
          >
            <Text style={[styles.meetingText, meetingType === '대면' && styles.meetingTextActive]}>대면</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.meetingBtn, meetingType === '비대면' && styles.meetingBtnActive]}
            onPress={() => setMeetingType('비대면')}
          >
            <Text style={[styles.meetingText, meetingType === '비대면' && styles.meetingTextActive]}>비대면</Text>
          </TouchableOpacity>
        </View>

        {/* 활동이름 */}
        <View style={styles.inputBox}>
          <TextInput
            value={activityName}
            onChangeText={setActivityName}
            placeholder="활동이름"
            placeholderTextColor="#667085"
            style={styles.input}
          />
        </View>

        {/* 조건 */}
        <View style={[styles.inputBox, { height: 140, paddingVertical: 8 }]}>
          <TextInput
            value={conditions}
            onChangeText={setConditions}
            placeholder="원하는 팀의 조건을 입력하세요"
            placeholderTextColor="#667085"
            style={[styles.input, { height: '100%', textAlignVertical: 'top' }]}
            multiline
          />
        </View>

        {/* 등록 버튼 */}
        <TouchableOpacity style={styles.submitBtn} activeOpacity={0.9} onPress={handleSubmit}>
          <Text style={styles.submitText}>등록</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#101828' },

  container: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 16 },
  inputBox: {
    backgroundColor: '#F2F4F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  input: { fontSize: 16, color: '#101828' },

  filterBox: {
    backgroundColor: '#F9F5FF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  checkboxGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  checkboxItem: { flexDirection: 'row', alignItems: 'center', width: '30%', marginVertical: 12 },
  checkboxSquare: {
    width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: '#344054', marginRight: 8, backgroundColor: '#fff',
  },
  checkboxSquareSelected: { backgroundColor: '#344054', borderColor: '#344054' },
  checkboxLabel: { fontSize: 14, color: '#101828', fontWeight: '600' },

  ddRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  ddButton: {
    backgroundColor: '#F2F4F7',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ddLabel: { fontSize: 14, color: '#101828', fontWeight: '700' },
  ddMenu: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
  },
  ddItem: { paddingVertical: 10, paddingHorizontal: 12 },
  ddItemText: { fontSize: 14, color: '#101828' },

  meetingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  meetingBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#E9D7FE',
    marginHorizontal: 6,
    alignItems: 'center',
  },
  meetingBtnActive: { backgroundColor: '#7A5AF8' },
  meetingText: { fontSize: 15, fontWeight: '700', color: '#7A5AF8' },
  meetingTextActive: { color: '#fff' },

  submitBtn: {
    backgroundColor: '#7A5AF8',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ddMenuOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    // 겹침 보장
    zIndex: 999,
    elevation: 10,
    // iOS 그림자
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    overflow: 'hidden',
  },
});

export default MakeTeamScreen;