import React, { useState, useEffect, JSX } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  Image
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Platform } from 'react-native';

const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'     // Android 에뮬레이터
    : 'http://localhost:3000';   // iOS 시뮬레이터 (실기기는 LAN IP로 교체)

interface EvaluationData {
  review_low: number;
  review_medium: number;
  review_high: number;
}

interface ReceivedReview {
  review_id: number;
  reviewer_id: number;
  related_team_id: number;
  review_high: number;
  review_medium: number;
  review_low: number;
  comment: string;
  created_at: string;
  reviewer_name: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  department?: string;
  studentId?: string;
  birth?: string;
  profile_picture?: string;
}

type RootStackParamList = {
  MyPage4: { user: User };
  MainTabs: { screen?: string };
};

type MyPage4NavigationProp = StackNavigationProp<RootStackParamList, 'MyPage4'>;
type MyPage4RouteProp = RouteProp<RootStackParamList, 'MyPage4'>;

const MyPage4: React.FC = () => {
  const navigation = useNavigation<MyPage4NavigationProp>();
  const route = useRoute<MyPage4RouteProp>();
  const { user } = route.params || {};

  const [evaluationSummary, setEvaluationSummary] = useState<EvaluationData>({
    review_low: 0,
    review_medium: 0,
    review_high: 0
  });
  
  const [receivedReviews, setReceivedReviews] = useState<ReceivedReview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // API에서 사용자의 평가 데이터 가져오기
  const fetchUserEvaluations = async (): Promise<void> => {
    try {
      console.log(`=== 평가 데이터 요청 시작 ===`);
      console.log(`사용자 ID: ${user.id}, 타입: ${typeof user.id}`);
      
      const response = await fetch(`${API_BASE_URL}/api/user/${user.id}/evaluations`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.evaluations) {
        const evaluations = {
          review_low: parseInt(data.evaluations.review_low) || 0,
          review_medium: parseInt(data.evaluations.review_medium) || 0,
          review_high: parseInt(data.evaluations.review_high) || 0
        };
        
        setEvaluationSummary(evaluations);
        console.log('설정된 평가 요약:', evaluations);
      }
    } catch (error) {
      console.error('⚠ 평가 데이터 가져오기 오류:', error);
    }
  };

  // ✅ 기존 디버깅 API를 활용해서 받은 리뷰 가져오기
  const fetchReceivedReviews = async (): Promise<void> => {
    try {
      console.log(`=== 받은 리뷰 요청 시작 (디버깅 API 활용) ===`);
      
      const response = await fetch(`${API_BASE_URL}/api/reviews/debug`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('전체 리뷰 응답:', data);
      
      if (data.success && data.reviews) {
        // ✅ 클라이언트에서 현재 사용자가 받은 리뷰만 필터링
        const myReceivedReviews = data.reviews.filter((review: any) => 
          review.reviewee_id === user.id
        );
        
        console.log('내가 받은 리뷰들:', myReceivedReviews);
        setReceivedReviews(myReceivedReviews);
      }
    } catch (error) {
      console.error('⚠ 받은 리뷰 가져오기 오류:', error);
    }
  };

  useEffect(() => {
    if (!user || !user.id) {
      console.error('❌ 사용자 정보가 올바르지 않습니다:', user);
      setIsLoading(false);
      return;
    }

    const loadData = async (): Promise<void> => {
      setIsLoading(true);
      await Promise.all([fetchUserEvaluations(), fetchReceivedReviews()]);
      setIsLoading(false);
    };
    
    loadData();
  }, [user?.id]);

  const renderEvaluationIcon = (type: 'review_low' | 'review_medium' | 'review_high'): JSX.Element => {
    const icons = {
      review_low: <Image source={require('../assets/face-frown.png')} style={styles.evaluationIconImage}/>,
      review_medium: <Image source={require('../assets/face-smile.png')} style={styles.evaluationIconImage}/>,
      review_high: <Image source={require('../assets/face-happy.png')} style={styles.evaluationIconImage}/>
    };
    
    const labels = {
      review_low: '별로예요',
      review_medium: '좋아요!',
      review_high: '최고예요'
    };

    const counts = {
      review_low: evaluationSummary.review_low,
      review_medium: evaluationSummary.review_medium,
      review_high: evaluationSummary.review_high
    };

    return (
      <View style={styles.evaluationItem}>
        <View style={styles.evaluationIcon}>{icons[type]}</View>
        <Text style={styles.evaluationLabel}>{labels[type]}</Text>
        <Text style={styles.evaluationCount}>{counts[type]}개</Text>
      </View>
    );
  };

  const renderReceivedReview = (review: ReceivedReview): JSX.Element => {
    let evaluationType = '';
    let evaluationIcon = null;
    
    if (review.review_high === 1) {
      evaluationType = '최고예요';
      evaluationIcon = <Image source={require('../assets/face-happy.png')} style={styles.reviewEvaluationIcon}/>;
    } else if (review.review_medium === 1) {
      evaluationType = '좋아요';
      evaluationIcon = <Image source={require('../assets/face-smile.png')} style={styles.reviewEvaluationIcon}/>;
    } else if (review.review_low === 1) {
      evaluationType = '별로예요';
      evaluationIcon = <Image source={require('../assets/face-frown.png')} style={styles.reviewEvaluationIcon}/>;
    }

    return (
      <View key={review.review_id} style={styles.reviewItem}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewActivityTitle}></Text>
          <View style={styles.reviewEvaluationContainer}>
            {evaluationIcon}
            <Text style={styles.reviewEvaluationType}>{evaluationType}</Text>
          </View>
        </View>
        
        <Text style={styles.reviewComment}>
          "{review.comment || '코멘트가 없습니다.'}"
        </Text>
        
        <View style={styles.reviewFooter}>
          <Text style={styles.reviewerName}></Text>
          <Text style={styles.reviewDate}>
            {new Date(review.created_at).toLocaleDateString('ko-KR')}
          </Text>
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>나의 평가</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>사용자 정보가 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>나의 평가</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>평가 정보를 불러오는 중...</Text>
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
        <Text style={styles.headerTitle}>나의 평가</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Evaluation Summary */}
        <View style={styles.evaluationSummary}>
          {renderEvaluationIcon('review_low')}
          {renderEvaluationIcon('review_medium')}
          {renderEvaluationIcon('review_high')}
        </View>

        {/* Received Reviews */}
        <View style={styles.reviewsList}>
          <Text style={styles.reviewsTitle}>받은 평가 코멘트</Text>
          
          {receivedReviews.length > 0 ? (
            receivedReviews.map(renderReceivedReview)
          ) : (
            <View style={styles.noReviewsContainer}>
              <Text style={styles.noReviewsText}>아직 받은 평가 코멘트가 없습니다.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  evaluationSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 24,
  },
  evaluationItem: {
    alignItems: 'center',
  },
  evaluationIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  evaluationIconImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  evaluationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  evaluationCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewsList: {
    gap: 16,
  },
  reviewsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  reviewItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7c4dff',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewActivityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  reviewEvaluationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewEvaluationIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  reviewEvaluationType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7c4dff',
  },
  reviewComment: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noReviewsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});

export default MyPage4;