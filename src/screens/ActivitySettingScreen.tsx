import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types';
import { WidgetPref, WidgetId, DEFAULT_WIDGET_PREFS } from '../constants/widgets';
import { loadWidgetPrefs, saveWidgetPrefs, reorder, toggleVisible } from '../utils/widgetPrefs';

type R = RouteProp<RootStackParamList, 'ActivitySettingScreen'>;

export default function ActivitySettingScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const teamId = route.params?.teamId ?? null;

  const [prefs, setPrefs] = useState<WidgetPref[]>(DEFAULT_WIDGET_PREFS);
  const visible = prefs.filter(p=>p.visible).sort((a,b)=>a.order-b.order);
  const hidden  = prefs.filter(p=>!p.visible).sort((a,b)=>a.order-b.order);

  useEffect(() => {
    (async () => setPrefs(await loadWidgetPrefs(teamId)))();
  }, [teamId]);

  const move = (index: number, dir: 'up' | 'down') => {
    const list = [...visible];
    const to = dir === 'up' ? index - 1 : index + 1;
    if (to < 0 || to >= list.length) return;
    const ids = list.map(x=>x.id);
    const fromIdx = prefs.findIndex(p=>p.id===ids[index]);
    const toIdx   = prefs.findIndex(p=>p.id===ids[to]);
    setPrefs(reorder(prefs, fromIdx, toIdx));
  };

  const onToggle = (id: WidgetId) => setPrefs(prev => toggleVisible(prev, id));

  const onSave = async () => {
    await saveWidgetPrefs(prefs, teamId);
    // @ts-ignore
    nav.goBack();
  };

  // 보이는 위젯 Row: [이름] [아이콘들]
  const Row = ({ item, idx, canMove }: { item: WidgetPref; idx: number; canMove: boolean }) => (
    <View style={s.row}>
      <Text style={s.name} numberOfLines={1}>{label(item.id)}</Text>

      <View style={s.rightGroup}>
        <Pressable onPress={() => onToggle(item.id)} style={s.eyeBtn} hitSlop={8}>
          <Image
            source={
              item.visible
                ? require('../assets/eye.png')
                : require('../assets/eye-off.png')
            }
            style={[s.eyeIcon, !item.visible && { opacity: 0.35 }]}
            resizeMode="contain"
          />
        </Pressable>

        <Pressable
          disabled={!canMove || idx === 0}
          onPress={() => move(idx, 'up')}
          style={({ pressed }) => [
            s.ctrl,
            (!canMove || idx === 0) && s.ctrlDisabled,
            pressed && canMove && idx > 0 && { opacity: 0.6 },
          ]}
          hitSlop={6}
        >
          <Text style={s.ctrlText}>∧</Text>
        </Pressable>

        <Pressable
          disabled={!canMove || idx === visible.length - 1}
          onPress={() => move(idx, 'down')}
          style={({ pressed }) => [
            s.ctrl,
            (!canMove || idx === visible.length - 1) && s.ctrlDisabled,
            pressed && canMove && idx < visible.length - 1 && { opacity: 0.6 },
          ]}
          hitSlop={6}
        >
          <Text style={s.ctrlText}>∨</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={s.wrap}>
      <Text style={s.title}>커스터마이징</Text>

      <Text style={s.section}>보이는 위젯</Text>
      {visible.length === 0 ? (
        <Text style={s.empty}>보이는 항목 없음</Text>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => i.id}
          renderItem={({ item, index }) => <Row item={item} idx={index} canMove />}
          scrollEnabled={false}
        />
      )}

      <Text style={[s.section, { marginTop: 16 }]}>숨김 위젯</Text>
      {hidden.length === 0 ? (
        <Text style={s.empty}>숨김 항목 없음</Text>
      ) : (
        <FlatList
          data={hidden}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={s.name} numberOfLines={1}>{label(item.id)}</Text>

              <View style={s.rightGroup}>
                <Pressable onPress={() => onToggle(item.id)} style={s.eyeBtn} hitSlop={8}>
                  <Image
                    source={require('../assets/eye-off.png')}
                    style={[s.eyeIcon, { opacity: 0.35 }]}
                    resizeMode="contain"
                  />
                </Pressable>
                {/* 숨김 리스트에서도 정렬 아이콘은 그대로 표시 (필요 없으면 제거 가능) */}
                <View style={[s.ctrl, s.ctrlDisabled]}><Text style={s.ctrlText}>∧</Text></View>
                <View style={[s.ctrl, s.ctrlDisabled]}><Text style={s.ctrlText}>∨</Text></View>
              </View>
            </View>
          )}
          scrollEnabled={false}
        />
      )}

      <Pressable onPress={onSave} style={s.saveBtn}>
        <Text style={s.saveTxt}>저장</Text>
      </Pressable>
    </View>
  );
}

const label = (id: WidgetId) =>
  id === 'issue' ? '이슈트래커' :
  id === 'notice' ? '공지사항' : '히트맵';

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  section: { fontSize: 14, fontWeight: '700', marginBottom: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },

  // 왼쪽은 텍스트만
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0B1220' },

  // 오른쪽 아이콘 묶음
  rightGroup: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },

  // 눈 아이콘
  eyeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  eyeIcon: { width: 22, height: 22 },

  // 정렬 아이콘(∧ ∨)
  ctrl: { paddingHorizontal: 6, paddingVertical: 4, marginLeft: 6, borderRadius: 8 },
  ctrlDisabled: { opacity: 0.35 },
  ctrlText: { fontSize: 18, color: '#0B1220' },

  empty: { color: '#9CA3AF' },

  saveBtn: {
    marginTop: 24,
    alignSelf: 'flex-end',
    backgroundColor: '#7A5AF8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveTxt: { color: '#fff', fontWeight: '700' },
});