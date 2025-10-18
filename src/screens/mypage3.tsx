// src/screens/MyPage3.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

interface User {
  id: number;
  email: string;
  name: string;
  department?: string;
  student_number?: string;
  birth_date?: string;
  profile_picture?: string;
}

interface SelectedMember {
  id: number;
  name: string;
  department: string;
  /** ✅ MyPage2와 일치하도록 team_id 사용 */
  team_id: number;
  activity_title: string;
}

type RootStackParamList = {
  MyPage3: { user: User; selectedMember: SelectedMember };
  MainTabs: { screen?: string };
};

type MyPage3NavigationProp = StackNavigationProp<RootStackParamList, 'MyPage3'>;
type MyPage3RouteProp = RouteProp<RootStackParamList, 'MyPage3'>;

type EvaluationType = 'low' | 'medium' | 'high' | null;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: { padding: 8 },
  backIcon: { fontSize: 24, color: '#000', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  placeholder: { width: 40 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 40 },
  questionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  memberName: { color: '#7c4dff' },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  evaluationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  evaluationButton: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minWidth: 80,
  },
  evaluationButtonSelected: {
    backgroundColor: '#e8d5ff',
    borderColor: '#7c4dff',
  },
  evaluationIcon: { width: 40, height: 40, marginBottom: 8 },
  evaluationText: { fontSize: 14, fontWeight: '600', color: '#333' },
  evaluationTextSelected: { color: '#7c4dff' },
  commentSection: { marginBottom: 32 },
  commentInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    minHeight: 188,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: '#7c4dff',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 0,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: { backgroundColor: '#ccc' },
  confirmButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#666', marginTop: 10 },
  editNotice: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  editNoticeText: { fontSize: 14, color: '#856404', textAlign: 'center', fontWeight: '500' },
});

const MyPage3: React.FC = () => {
  const navigation = useNavigation<MyPage3NavigationProp>();
  const route = useRoute<MyPage3RouteProp>();
  const { user, selectedMember } = route.params;

  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationType>(null);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExistingReview, setIsExistingReview] = useState<boolean>(false);

  const evaluationOptions = [
    { type: 'low' as EvaluationType, icon: require('../assets/face-frown.png'), text: '별로예요' },
    { type: 'medium' as EvaluationType, icon: require('../assets/face-smile.png'), text: '좋아요' },
    { type: 'high' as EvaluationType, icon: require('../assets/face-happy.png'), text: '최고예요' },
  ];

  // 기존 평가 조회 (team_id 사용)
  const fetchExistingReview = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reviews/existing/${user.id}/${selectedMember.id}/${selectedMember.team_id}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();

      if (data.success && data.existingReview) {
        setSelectedEvaluation(data.existingReview.evaluation_type as EvaluationType);
        setComment(data.existingReview.comment || '');
        setIsExistingReview(true);
      } else {
        setIsExistingReview(false);
      }
    } catch (error) {
      console.error('기존 평가 조회 오류:', error);
      setIsExistingReview(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExistingReview();
  }, [user.id, selectedMember.id, selectedMember.team_id]);

  const handleSubmitEvaluation = async () => {
    if (!selectedEvaluation) {
      Alert.alert('알림', '평가를 선택해주세요.');
      return;
    }
    if (comment.trim().length === 0) {
      Alert.alert('알림', '팀원에 대한 의견을 작성해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const evaluationData = {
        reviewer_id: user.id,
        reviewee_id: selectedMember.id,
        /** ✅ 서버의 related_team_id에 team_id를 넣는다 */
        related_team_id: selectedMember.team_id,
        review_high: selectedEvaluation === 'high' ? 1 : 0,
        review_medium: selectedEvaluation === 'medium' ? 1 : 0,
        review_low: selectedEvaluation === 'low' ? 1 : 0,
        comment: comment.trim(),
        is_update: isExistingReview,
      };

      const response = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evaluationData),
      });

      const responseText = await response.text();
      if (!response.ok) throw new Error(`평가 전송 실패: ${response.status} - ${responseText}`);

      const result = JSON.parse(responseText);
      if (result.success) {
        Alert.alert(
          '평가 완료',
          `${selectedMember.name}님에 대한 평가가 성공적으로 ${isExistingReview ? '수정' : '저장'}되었습니다.`,
          [{ text: '확인', onPress: () => navigation.navigate('MainTabs', { screen: 'MyPage' }) }]
        );
      } else {
        throw new Error(result.message || '평가 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('평가 전송 오류:', error);
      Alert.alert('오류', error instanceof Error ? error.message : '평가 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedEvaluation !== null && comment.trim().length > 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>팀원평가</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>기존 평가를 확인하는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isSubmitting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>팀원평가</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{isExistingReview ? '평가를 수정하는 중...' : '평가를 저장하는 중...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
       <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>팀원평가</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.questionText}>
          <Text style={styles.memberName}>{selectedMember.name}</Text>님과의 활동은 어땠나요?
        </Text>
        <Text style={styles.subtitleText}>
          {isExistingReview ? '이전에 작성한 평가를 수정할 수 있습니다' : '팀원평가는 상대방이 볼 수 없어요'}
        </Text>

        {isExistingReview && (
          <View style={styles.editNotice}>
            <Text style={styles.editNoticeText}>📝 이전에 작성한 평가를 수정하고 있습니다</Text>
          </View>
        )}

        <View style={styles.evaluationContainer}>
          {evaluationOptions.map((option) => (
            <TouchableOpacity
              key={option.type}
              style={[styles.evaluationButton, selectedEvaluation === option.type && styles.evaluationButtonSelected]}
              onPress={() => setSelectedEvaluation(option.type)}
            >
              <Image source={option.icon} style={styles.evaluationIcon} />
              <Text style={[styles.evaluationText, selectedEvaluation === option.type && styles.evaluationTextSelected]}>
                {option.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.commentSection}>
          <TextInput
            style={styles.commentInput}
            placeholder="팀원에 대해 알려주세요"
            placeholderTextColor="#999"
            multiline
            value={comment}
            onChangeText={setComment}
            maxLength={500}
          />
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, !isFormValid && styles.confirmButtonDisabled]}
          onPress={handleSubmitEvaluation}
          disabled={!isFormValid || isSubmitting}
        >
          <Text style={styles.confirmButtonText}>{isExistingReview ? '수정하기' : '확인'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MyPage3;