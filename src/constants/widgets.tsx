// 레지스트리 + 위젯 컴포넌트 관리
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import IssueWidget from '../widgets/IssueWidget';
import NoticeWidget from '../widgets/NoticeWidget';
import HeatWidget from '../widgets/HeatWidget';

export type WidgetId = 'issue' | 'notice' | 'calendar' | 'heatmap';
export type WidgetPref = { id: WidgetId; visible: boolean; order: number };
export type WidgetComponentProps = { teamId?: number | null; refreshKey?: number };

export const DEFAULT_WIDGET_PREFS: WidgetPref[] = [
  { id: 'issue', visible: true, order: 10 },
  { id: 'notice', visible: true, order: 20 },
  { id: 'calendar', visible: false, order: 30 },
  { id: 'heatmap', visible: true, order: 40 }, // ✅ 기본 표시하도록 변경 가능
];

// 임시 다른 위젯
const Placeholder = ({ title }: { title: string }) => (
  <View style={styles.card}>
    <Text style={styles.title}>{title}</Text>
    <Text>콘텐츠 준비중…</Text>
  </View>
);

export const CalendarWidget = () => <Placeholder title="캘린더" />;

// ✅ 위젯 등록: refreshKey를 전달 가능하게
export const WIDGET_COMPONENTS: Record<WidgetId, React.FC<WidgetComponentProps>> = {
  issue: (props) => <IssueWidget {...props} />,
  notice: (props) => <NoticeWidget {...props} />,
  calendar: () => <CalendarWidget />,
  heatmap: (props) => <HeatWidget {...props} />,
};

// ✅ 실제 대시보드처럼 동작하는 컴포넌트
export default function Widgets({ teamId }: { teamId?: number | null }) {
  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ 목표가 추가/수정/삭제될 때 호출
  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // 렌더 순서 정렬
  const sortedWidgets = [...DEFAULT_WIDGET_PREFS]
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* ✅ 새로고침 테스트 버튼 (선택사항) */}
        <Button title="🔄 위젯 새로고침" onPress={handleRefresh} />

        {/* ✅ 동적으로 위젯 렌더링 */}
        {sortedWidgets.map(({ id }) => {
          const WidgetComponent = WIDGET_COMPONENTS[id];
          return (
            <View key={id} style={styles.widgetWrapper}>
              <WidgetComponent teamId={teamId} refreshKey={refreshKey} />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 40,
  },
  widgetWrapper: {
    marginBottom: 18,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F7F7FD',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6E6F5',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
});
