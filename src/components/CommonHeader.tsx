// src/components/CommonHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type CommonHeaderProps = {
  showBackButton?: boolean;
  titleColor?: string;
  iconTintColor?: string;
  bottomSpace?: number;     // ← 헤더 아래 여백(px)
};

const CommonHeader: React.FC<CommonHeaderProps> = ({
  showBackButton = false,
  titleColor = '#7A5AF8',
  iconTintColor = '#101828',
  bottomSpace = 12,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const TOP_PADDING = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8;

  return (
    <>
      <View style={[styles.header, { paddingTop: TOP_PADDING }]}>
        <Text style={[styles.logo, { color: titleColor }]}>끼리끼리</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications' as never)}>
          <Image source={require('../assets/bell.png')} style={styles.icon} resizeMode="contain" />
        </TouchableOpacity>
      </View>
      <View style={{ height: bottomSpace }} /> 
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  logo: { fontSize: 20, fontWeight: '700' },
  icon: { width: 22, height: 22, tintColor: '#101828' },
  divider: { height: 1, backgroundColor: '#E4E7EC', marginTop: 6 },
});

export default CommonHeader;