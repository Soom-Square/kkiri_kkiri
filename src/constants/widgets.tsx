// 레지스트리 + 임시 위젯 컴포넌트
import React from 'react';
import IssueWidget from '../widgets/IssueWidget';
import { View, Text, StyleSheet } from 'react-native';

export type WidgetId = 'issue' | 'notice' | 'calendar' | 'heatmap';
export type WidgetPref = { id: WidgetId; visible: boolean; order: number };
export type WidgetComponentProps = { teamId?: number | null };

export const DEFAULT_WIDGET_PREFS: WidgetPref[] = [
  { id: 'issue', visible: true, order: 10 },
  { id: 'notice', visible: true, order: 20 },
  { id: 'calendar', visible: false, order: 30 },
  { id: 'heatmap', visible: false, order: 40 },
];

// 임시 다른 위젯(그대로 두거나 나중에 교체)
const Placeholder = ({ title }: { title: string }) => (
  <View style={styles.card}><Text style={styles.title}>{title}</Text><Text>콘텐츠 준비중…</Text></View>
);

export const NoticeWidget   = () => <Placeholder title="공지사항" />;
export const CalendarWidget = () => <Placeholder title="캘린더" />;
export const HeatmapWidget  = () => <Placeholder title="히트맵" />;

// 레지스트리: 이제 각 위젯이 teamId prop을 받을 수 있게 타입 지정
export const WIDGET_COMPONENTS: Record<WidgetId, React.FC<WidgetComponentProps>> = {
  issue: IssueWidget,
  notice: () => <NoticeWidget />,
  calendar: () => <CalendarWidget />,
  heatmap: () => <HeatmapWidget />,
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F7F7FD',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6E6F5',
    marginBottom: 14,
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
});



// // 임시(플레이스홀더) 위젯들
// export const IssueWidget = () => (
//   <View style={styles.card}>
//     <Text style={styles.title}>이슈트래커(임시)</Text>
//     <Text>여기에 이슈 목록이 들어갑니다.</Text>
//   </View>
// );
// export const NoticeWidget = () => (
//   <View style={styles.card}>
//     <Text style={styles.title}>공지사항(임시)</Text>
//     <Text>최근 공지 3개…</Text>
//   </View>
// );
// export const CalendarWidget = () => (
//   <View style={styles.card}>
//     <Text style={styles.title}>캘린더(임시)</Text>
//     <Text>이번 주 일정 요약…</Text>
//   </View>
// );
// export const HeatmapWidget = () => (
//   <View style={styles.card}>
//     <Text style={styles.title}>히트맵(임시)</Text>
//     <Text>활동 히트맵(주/월)…</Text>
//   </View>
// );

// export const WIDGET_COMPONENTS: Record<WidgetId, React.FC> = {
//   issue: IssueWidget,
//   notice: NoticeWidget,
//   calendar: CalendarWidget,
//   heatmap: HeatmapWidget,
// };

// const styles = StyleSheet.create({
//   card: {
//     padding: 14,
//     borderRadius: 16,
//     backgroundColor: '#F7F7FD',
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: '#E6E6F5',
//     marginBottom: 14,
//   },
//   title: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
// });
