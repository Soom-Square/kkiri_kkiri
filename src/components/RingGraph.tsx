// src/components/RingGraph.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';

type RingItem = {
  percent: number; // 0~100
};

type Props = {
  size?: number;           // 전체 크기(px)
  stroke?: number;         // 링 두께
  gap?: number;            // 링 사이 간격
  rings: RingItem[];       // 안쪽 -> 바깥쪽 순서
  colors?: string[];       // 안쪽 -> 바깥쪽 색상
  trackColor?: string;     // 트랙 색
  startAngleDeg?: number;  // 시작 각도(기본 12시 = -90)
};

const DEFAULT_COLORS = ['#CFC5FD', '#B9A9FC', '#9B83FB', '#7A5AF8'];

export default function RingGraph({
  size = 220,
  stroke = 14,
  gap = 6,
  rings,
  colors = DEFAULT_COLORS,
  trackColor = '#EFEAFE',
  startAngleDeg = -90,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;

  // 가장 바깥 링의 반지름
  const outerR = size / 2 - stroke / 2;

  // 안쪽 → 바깥쪽 반지름 배열
  const radii = rings.map((_, i, arr) => outerR - (arr.length - 1 - i) * (stroke + gap));

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <G rotation={startAngleDeg} originX={cx} originY={cy}>
          {rings.map((ring, i) => {
            const r = radii[i];
            const circumference = 2 * Math.PI * r;

            // percent 방어(clamp + NaN/undefined 처리)
            const raw = typeof ring?.percent === 'number' ? ring.percent : 0;
            const clamped = Math.max(0, Math.min(100, Math.round(raw)));
            const dash = (clamped / 100) * circumference;

            return (
              <React.Fragment key={i}>
                {/* 트랙 */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  stroke={trackColor}
                  strokeWidth={stroke}
                  fill="none"
                />
                {/* 진행: 0%면 점(캡) 생성 방지 위해 렌더 아예 생략 */}
                {clamped > 0 && (
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    stroke={colors[i % colors.length]}
                    strokeWidth={stroke}
                    fill="none"
                    strokeDasharray={`${dash}, ${circumference - dash}`}
                    strokeLinecap="round"
                  />
                )}
              </React.Fragment>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});