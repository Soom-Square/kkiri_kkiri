import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Animated,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import colors from '../config/colors';

type Props = TextInputProps & {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
};

export default function CustomTextInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  error,
  ...rest
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const animatedIsFocused = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: isFocused || value ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    position: 'absolute' as const,
    left: 16,
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [22, 8],
    }),
    fontSize: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 13],
    }),
    color: error
      ? '#EF4444'
      : isFocused
      ? colors.inputText
      : colors.inputPlaceholder, // 포커스 전엔 placeholder 톤
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: error
              ? '#EF4444'
              : isFocused
              ? '#000000' // ✅ 포커스 시 검정색 테두리
              : colors.inputBorder, // 기본 옅은 회색
          },
        ]}
      >
        <Animated.Text style={labelStyle}>{label}</Animated.Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry}
          placeholderTextColor={colors.inputPlaceholder}
          {...rest}
        />
      </View>
      {error && <Text style={styles.support}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    backgroundColor: '#F9FAFB', 
    borderRadius: 12,
    borderWidth: 1, // 기본도 살짝 보이게
    paddingTop: 26,
    paddingBottom: 8,
    paddingHorizontal: 12,
    height: 64,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    color: colors.inputText || '#101828',
    padding: 0,
    height: 24,
  },
  support: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});