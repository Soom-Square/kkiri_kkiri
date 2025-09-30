import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Image, TextInput, Alert, Modal, ScrollView } from 'react-native';
import type { WidgetComponentProps } from '../constants/widgets';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

// 공지사항 데이터 타입
type AnnouncementItem = {
  board_id: number;
  board_title: string;
  post_id: number;
  content: string;
  created_at: string;
  author_name: string;
};

// 시간 차이 계산 유틸리티
const getTimeAgo = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
};

// 실제 공지사항 위젯 구현
const NoticeWidget: React.FC<WidgetComponentProps> = ({ teamId }) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // 게시글 작성 관련 상태
  const [isWriteModalVisible, setIsWriteModalVisible] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  
  // 더보기 상태
  const [showAll, setShowAll] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    if (!teamId) {
      setAnnouncements([]);
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/announcements`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAnnouncements(data || []);
    } catch (error) {
      console.error('공지사항 조회 실패:', error);
      setAnnouncements([]);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleEditTitleClick = () => {
    setEditedTitle(boardTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) {
      Alert.alert('알림', '제목을 입력해주세요');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/board-title`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: editedTitle.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '제목 수정 실패');
      }

      await fetchAnnouncements();
      setIsEditingTitle(false);
      Alert.alert('성공', '게시판 제목이 수정되었습니다');
    } catch (error) {
      console.error('제목 수정 실패:', error);
      Alert.alert('오류', '제목 수정에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  // 게시글 작성 모달 열기
  const handleOpenWriteModal = () => {
    setNewPostContent('');
    setIsWriteModalVisible(true);
  };

  // 게시글 작성 모달 닫기
  const handleCloseWriteModal = () => {
    setIsWriteModalVisible(false);
    setNewPostContent('');
  };

  // 게시글 작성
  const handleSubmitPost = async () => {
    if (!newPostContent.trim()) {
      Alert.alert('알림', '내용을 입력해주세요');
      return;
    }

    if (!user?.id) {
      Alert.alert('오류', '로그인이 필요합니다');
      return;
    }

    try {
      setIsPosting(true);
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newPostContent.trim(),
          author_id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '게시글 작성 실패');
      }

      Alert.alert('성공', '공지사항이 작성되었습니다');
      handleCloseWriteModal();
      await fetchAnnouncements();
    } catch (error) {
      console.error('게시글 작성 실패:', error);
      Alert.alert('오류', '게시글 작성에 실패했습니다');
    } finally {
      setIsPosting(false);
    }
  };

  if (!teamId) {
    return null;
  }

  const boardTitle = announcements[0]?.board_title || '공지사항';
  const displayedAnnouncements = showAll ? announcements : announcements.slice(0, 3);
  const hasMore = announcements.length > 3;

  return (
    <View style={styles.noticeWidget}>
      <View style={styles.noticeHeaderSection}>
        <View style={styles.noticeHeaderRow}>
          <Text style={styles.noticeMainTitle}>공지사항</Text>
          <Pressable 
            style={styles.addButton} 
            onPress={handleOpenWriteModal}
            hitSlop={10}
          >
            <Image 
              source={require('../assets/plus-circle.png')} 
              style={styles.addIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>
        <View style={styles.divider} />
      </View>
      
      <View style={styles.noticeCard}>
        {/* 제목 편집 UI */}
        {isEditingTitle ? (
          <View style={styles.titleEditContainer}>
            <TextInput
              style={styles.titleInput}
              value={editedTitle}
              onChangeText={setEditedTitle}
              placeholder="게시판 제목을 입력하세요"
              editable={!isSaving}
            />
            <View style={styles.titleEditButtons}>
              <Pressable 
                style={[styles.titleEditButton, styles.saveButton]} 
                onPress={handleSaveTitle}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? '저장 중...' : '저장'}
                </Text>
              </Pressable>
              <Pressable 
                style={[styles.titleEditButton, styles.cancelButton]} 
                onPress={handleCancelEdit}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.titleDisplayContainer}>
            <Text style={styles.noticeCenterTitle}>{boardTitle}</Text>
            <Pressable 
              style={styles.editIconButton} 
              onPress={handleEditTitleClick}
              hitSlop={10}
            >
              <Image 
                source={require('../assets/pencil-01.png')} 
                style={styles.editIcon}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        )}
        
        {isLoading ? (
          <Text style={styles.loadingText}>로딩 중...</Text>
        ) : displayedAnnouncements.length > 0 ? (
          <>
            {displayedAnnouncements.map((item, index) => (
              <View key={item.post_id}>
                <View style={styles.noticeItem}>
                  <Text style={styles.noticeItemTitle} numberOfLines={1}>
                    {item.content}
                  </Text>
                  <Text style={styles.noticeItemMeta}>
                    {getTimeAgo(item.created_at)} | {item.author_name}
                  </Text>
                </View>
                {index < displayedAnnouncements.length - 1 && (
                  <View style={styles.itemDivider} />
                )}
              </View>
            ))}
            
            {/* 더보기 버튼 */}
            {hasMore && (
              <Pressable 
                style={styles.moreButton} 
                onPress={() => setShowAll(!showAll)}
              >
                <Text style={styles.moreButtonText}>
                  {showAll ? '접기' : '더보기'}
                </Text>
                <Text style={styles.moreButtonArrow}>
                  {showAll ? '▲' : '▼'}
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <Text style={styles.emptyText}>공지사항이 없습니다</Text>
        )}
      </View>

      {/* 게시글 작성 모달 */}
      <Modal
        visible={isWriteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseWriteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>공지사항 작성</Text>
              <Pressable onPress={handleCloseWriteModal} hitSlop={10}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </Pressable>
            </View>
            
            <TextInput
              style={styles.modalTextInput}
              value={newPostContent}
              onChangeText={setNewPostContent}
              placeholder="공지사항 내용을 입력하세요"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!isPosting}
            />
            
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, styles.modalCancelButton]} 
                onPress={handleCloseWriteModal}
                disabled={isPosting}
              >
                <Text style={styles.modalCancelButtonText}>취소</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.modalSubmitButton]} 
                onPress={handleSubmitPost}
                disabled={isPosting}
              >
                <Text style={styles.modalSubmitButtonText}>
                  {isPosting ? '작성 중...' : '작성'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  noticeWidget: {
    marginTop: 20,
  },
  noticeHeaderSection: {
    marginBottom: 16,
  },
  noticeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  noticeMainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  addButton: {
    padding: 4,
  },
  addIcon: {
    width: 28,
    height: 28,
    tintColor: '#7A5AF8',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    width: '100%',
  },
  noticeCard: {
    backgroundColor: '#F4F3FF',
    borderRadius: 20,
    padding: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  
  // 제목 표시 컨테이너
  titleDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  noticeCenterTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
  },
  editIconButton: {
    marginLeft: 8,
    padding: 4,
  },
  editIcon: {
    width: 20,
    height: 20,
    tintColor: '#6B7280',
  },
  
  // 제목 편집 UI
  titleEditContainer: {
    marginBottom: 24,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  titleEditButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  titleEditButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#7A5AF8',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // 공지사항 아이템
  noticeItem: {
    paddingVertical: 8,
  },
  noticeItemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
    marginBottom: 8,
  },
  noticeItemMeta: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#D1D5DB',
    marginVertical: 4,
  },
  
  // 더보기 버튼
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  moreButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginRight: 4,
  },
  moreButtonArrow: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
  },
  
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300',
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 150,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  modalCancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSubmitButton: {
    backgroundColor: '#7A5AF8',
  },
  modalSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NoticeWidget;