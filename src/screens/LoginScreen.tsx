import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import CustomTextInput from '../components/CustomTextInput';
import colors from '../config/colors';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { setUser } = useAuth(); 

  
  const API_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/login'
    : 'http://localhost:3000/login';
    
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user); // ✅ 전역에 저장
        Alert.alert(
        '로그인 성공',
        `${data.user.name}님 환영합니다!`,
        [
          {
            text: '확인',
            onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
            },
          },
        ],
        { cancelable: false }
      );
      } else {
        Alert.alert('로그인 실패', data.message || '이메일 또는 비밀번호를 확인해주세요.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      Alert.alert('에러', '서버에 연결할 수 없습니다.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>끼리끼리</Text>
      <CustomTextInput
        label="이메일"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none" 
        keyboardType="email-address"
        autoCorrect={false}
      />
      <CustomTextInput
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>로그인</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('PasswordResetScreen')}>
        <Text style={styles.link}>비밀번호를 잊으셨나요?</Text>
      </TouchableOpacity>

      <Text style={styles.signup}>
        계정이 없으신가요?{' '}
        <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
          회원가입
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, justifyContent: 'center', flex: 1, backgroundColor: 'white', },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginBottom: 40,
    color: colors.primary,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: colors.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  signup: {
    marginTop: 8,
    textAlign: 'center',
    color: colors.inputPlaceholder,
  },
});