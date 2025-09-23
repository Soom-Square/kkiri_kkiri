import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
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
    // 이전 화면이 다시 포커스될 때 로드하도록 하면 충분하지만,
    // 바로 반영 원하면 파라미터 플래그를 내려보내도 됨.
    // @ts-ignore
    nav.goBack();
  };

  const Row = ({ item, idx, canMove }: { item: WidgetPref; idx: number; canMove: boolean }) => (
    <View style={s.row}>
      <Text style={[s.eye, item.visible ? s.eyeOn : s.eyeOff]} onPress={() => onToggle(item.id)}>
        {item.visible ? '👁' : '🙈'}
      </Text>
      <Text style={s.name}>
        {label(item.id)}
      </Text>
      <View style={{flexDirection:'row'}}>
        <Pressable disabled={!canMove || idx===0} onPress={() => move(idx, 'up')}   style={({pressed})=>[s.ctrl, (pressed && canMove && idx>0) && {opacity:0.6}]}>
          <Text>▲</Text>
        </Pressable>
        <Pressable disabled={!canMove || idx===visible.length-1} onPress={() => move(idx, 'down')} style={({pressed})=>[s.ctrl, (pressed && canMove && idx<visible.length-1) && {opacity:0.6}]}>
          <Text>▼</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={s.wrap}>
      <Text style={s.title}>커스터마이징</Text>

      <Text style={s.section}>보이는 위젯</Text>
      {visible.length === 0 ? <Text style={s.empty}>보이는 항목 없음</Text> :
        <FlatList
          data={visible}
          keyExtractor={i=>i.id}
          renderItem={({item, index}) => <Row item={item} idx={index} canMove />}
          scrollEnabled={false}
        />
      }

      <Text style={[s.section,{marginTop:16}]}>숨김 위젯</Text>
      {hidden.length === 0 ? <Text style={s.empty}>숨김 항목 없음</Text> :
        <FlatList
          data={hidden}
          keyExtractor={i=>i.id}
          renderItem={({item}) =>
            <View style={s.row}>
              <Text style={[s.eye, s.eyeOff]} onPress={() => onToggle(item.id)}>🙈</Text>
              <Text style={s.name}>{label(item.id)}</Text>
              <Pressable onPress={() => onToggle(item.id)} style={s.showBtn}><Text>보이기</Text></Pressable>
            </View>
          }
          scrollEnabled={false}
        />
      }

      <Pressable onPress={onSave} style={s.saveBtn}><Text style={s.saveTxt}>저장</Text></Pressable>
    </View>
  );
}

const label = (id: WidgetId) =>
  id === 'issue' ? '이슈트래커' :
  id === 'notice' ? '공지사항' :
  id === 'calendar' ? '캘린더' : '히트맵';

const s = StyleSheet.create({
  wrap: { flex:1, backgroundColor:'#fff', padding:20 },
  title:{ fontSize:20, fontWeight:'800', marginBottom:10 },
  section:{ fontSize:14, fontWeight:'700', marginBottom:8 },
  row: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10, borderBottomWidth:StyleSheet.hairlineWidth, borderColor:'#eee' },
  eye: { width:28, textAlign:'center', fontSize:18 },
  eyeOn:{ opacity:1 }, eyeOff:{ opacity:0.6 },
  name:{ flex:1, marginLeft:6, fontSize:15 },
  ctrl:{ paddingHorizontal:8, paddingVertical:4, marginLeft:4 },
  empty:{ color:'#9CA3AF' },
  showBtn:{ paddingHorizontal:10, paddingVertical:6, borderWidth:StyleSheet.hairlineWidth, borderRadius:10 },
  saveBtn:{ marginTop:24, alignSelf:'flex-end', backgroundColor:'#7A5AF8', paddingHorizontal:16, paddingVertical:10, borderRadius:12 },
  saveTxt:{ color:'#fff', fontWeight:'700' },
});