// src/screens/PasswordResetScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CustomTextInput from '../components/CustomTextInput';
import colors from '../config/colors';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MAX_SECONDS = 180; // 3분

// ➜ API 서버 베이스 URL (프로젝트에 맞게 조정)
const API_BASE =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

// 공통 fetch 헬퍼
async function postJSON(path: string, body: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'request failed');
  return json;
}

export default function PasswordResetScreen() {
  const nav = useNavigation<Nav>();

  // form states
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPwCheck, setNewPwCheck] = useState('');

  // ui states
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 타이머
  useEffect(() => {
    if (secondsLeft <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [secondsLeft]);

  const mmss = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m)}:${String(s).padStart(2, '0')}`;
  }, [secondsLeft]);

  // 인증번호 전송
  const onSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('확인', '가입하신 이메일을 입력해주세요.');
      return;
    }
    try {
      setSending(true);
      await postJSON('/api/auth/forgot-password', { email });
      setCodeSent(true);
      setCode('');
      setCodeVerified(false);
      setSecondsLeft(MAX_SECONDS);
      Alert.alert('전송 완료', '인증번호가 이메일로 전송되었습니다.');
    } catch (e: any) {
      Alert.alert('오류', e.message || '인증번호 전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  // 인증번호 확인
  const onVerifyCode = async () => {
    if (!codeSent) return;
    if (!code.trim()) {
      Alert.alert('확인', '인증번호를 입력해주세요.');
      return;
    }
    try {
      setVerifying(true);
      await postJSON('/api/auth/verify-reset-code', { email, code });
      setCodeVerified(true);
      Alert.alert('인증 성공', '이제 새 비밀번호를 입력해주세요.');
    } catch (e: any) {
      setCodeVerified(false);
      Alert.alert('인증 실패', e.message || '인증번호가 올바르지 않습니다.');
    } finally {
      setVerifying(false);
    }
  };

  const pwMismatch = newPwCheck.length > 0 && newPw !== newPwCheck;
  const canSubmit = codeVerified && !!newPw && !!newPwCheck && !pwMismatch;

  // 최종 비밀번호 재설정
  const onSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      await postJSON('/api/auth/reset-password', {
        email,
        code,
        newPassword: newPw,
      });
      Alert.alert('완료', '비밀번호가 재설정되었습니다.', [
        { text: '로그인', onPress: () => nav.navigate('Login' as never) },
      ]);
    } catch (e: any) {
      Alert.alert('오류', e.message || '비밀번호 재설정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>가입하신 이메일을 입력해주세요</Text>

        {/* 이메일 */}
        <CustomTextInput
          label="이메일"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          editable={!codeVerified} // 인증 후엔 이메일 변경 막기
        />

        {/* 인증번호 전송 버튼 */}
        <TouchableOpacity
          style={[styles.actionBtn, (sending || secondsLeft > 0) && { opacity: 0.7 }]}
          disabled={sending || secondsLeft > 0}
          onPress={onSendCode}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>
            {secondsLeft > 0 ? `재전송 ${mmss}` : '인증번호 전송'}
          </Text>
        </TouchableOpacity>

        {/* 인증번호 + 확인 버튼(아래 배치) */}
        <View style={{ marginBottom: 10 }}>
          <CustomTextInput
            label="인증번호"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            editable={codeSent && !codeVerified}
          />
          <TouchableOpacity
            style={[
              styles.verifyBtn,
              (!codeSent || codeVerified) && { opacity: 0.5 },
            ]}
            disabled={!codeSent || codeVerified || verifying}
            onPress={onVerifyCode}
            activeOpacity={0.85}
          >
            <Text style={styles.verifyBtnText}>{codeVerified ? '완료' : '확인'}</Text>
          </TouchableOpacity>
        </View>

        {/* 새 비밀번호 */}
        <CustomTextInput
          label="비밀번호"
          value={newPw}
          onChangeText={setNewPw}
          secureTextEntry
          editable={codeVerified}
        />
        <CustomTextInput
          label="비밀번호 확인"
          value={newPwCheck}
          onChangeText={setNewPwCheck}
          secureTextEntry
          editable={codeVerified}
          error={pwMismatch ? '비밀번호가 일치하지 않습니다' : undefined}
        />

        {/* 제출 */}
        <TouchableOpacity
          style={[styles.submitBtn, (!canSubmit || submitting) && { opacity: 0.5 }]}
          disabled={!canSubmit || submitting}
          onPress={onSubmit}
          activeOpacity={0.9}
        >
          <Text style={styles.submitText}>비밀번호 재설정</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const TEXT_MAIN = '#101828';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_MAIN,
    marginTop: 6,
    marginBottom: 16,
  },
  actionBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary, // #7A5AF8
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  verifyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  verifyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});