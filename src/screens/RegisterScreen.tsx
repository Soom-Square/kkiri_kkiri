import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, SafeAreaView } from 'react-native';
import CustomTextInput from '../components/CustomTextInput';
import colors from '../config/colors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types'; // 실제 경로로 수정

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

const API_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/register'
    : 'http://localhost:3000/register';

export default function RegisterScreen() {
  const nav = useNavigation<RegisterScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [studentId, setStudentId] = useState('');
  const [birth, setBirth] = useState('');
  const pwMismatch = passwordConfirm && password !== passwordConfirm;

  const handleRegister = async () => {
    if (!email || !password || !passwordConfirm || !name) {
      Alert.alert('입력 오류', '모든 필수 항목을 입력해주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert('비밀번호 불일치', '비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          department,
          studentId,
          birth,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
        '회원가입 성공',
        '이제 로그인할 수 있습니다.',
        [
          {
            text: '확인',
            onPress: () => nav.navigate('Login'),  // 'Login'은 로그인 화면의 라우트 이름
          },
        ],
        { cancelable: false }
      );
      } else {
        Alert.alert('회원가입 실패', result.message || '서버 오류 발생');
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      Alert.alert('에러', '서버와 연결할 수 없습니다.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>끼리끼리</Text>

        <CustomTextInput
            label="이메일"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"       // ✅ 첫 글자 대문자 방지
            keyboardType="email-address"
            autoCorrect={false}
        />
        <CustomTextInput
            label="비밀번호"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
        />
        <CustomTextInput
            label="비밀번호 확인"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
            error={pwMismatch ? '비밀번호가 일치하지 않습니다' : undefined}
        />
        <CustomTextInput label="이름" value={name} onChangeText={setName} />
        <CustomTextInput label="학과" value={department} onChangeText={setDepartment} />
        <CustomTextInput label="학번" value={studentId} onChangeText={setStudentId} />
        <CustomTextInput label="생년월일" value={birth} onChangeText={setBirth} />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>회원가입</Text>
        </TouchableOpacity>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginVertical: 30,
    color: colors.primary,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});