// export default App;
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './src/context/AuthContext';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import colors from './src/config/colors';

import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import InfoDetailScreen from './src/screens/Info/InfoDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import EvaluationScreen from './src/screens/EvaluationScreen';
import TeamFindScreen from './src/screens/TeamFindScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import TeamMakeScreen from './src/screens/TeamMakeScreen';
import MatchingDetailScreen from './src/screens/MatchingDetailScreen'
import ActivitySettingScreen from './src/screens/ActivitySettingScreen';

// MyPage 관련 스크린 import 추가
import MyPage2 from './src/screens/mypage2';
import MyPage3 from './src/screens/mypage3';
import MyPage4 from './src/screens/mypage4';

import TodoScreen from './src/screens/TodoScreen';
import TodoTeamScreen from './src/screens/TodoTeamScreen';


import { User } from './src/types';
import type { RootStackParamList } from './src/types';

const Stack = createStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: true,
            headerTintColor: colors.inputText,
            headerShadowVisible: false,
            headerTitleAlign: 'center',
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{
              title: '회원가입',
              headerBackTitle: '',
              headerLeftContainerStyle: {
                paddingLeft: 10,
              },
            }}
          />
          <Stack.Screen
            name="MainTabs"
            component={BottomTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="InfoDetail"
            component={InfoDetailScreen}
            options={{
              title: '비교과 활동',
              headerBackTitle: '',
              headerLeftContainerStyle: {
                paddingLeft: 10,
              },
            }}
          />
          <Stack.Screen
           name="Settings"
           component={SettingsScreen} 
            options={{
              title: '설정',
              headerTitleAlign: 'center',
              headerBackTitle: '',
              headerLeftContainerStyle: {
                paddingLeft: 10,
              },
              headerTitleStyle: {
                width: '100%',
                textAlign: 'center',
              }
            }}
          />
          <Stack.Screen name="Evaluation" component={EvaluationScreen} />
          <Stack.Screen name="TeamFind" component={TeamFindScreen} />
          <Stack.Screen
            name="Notifications"
            component={NotificationScreen}
            options={{
              title: '알림',
              headerBackTitle: '',
              headerTitleAlign: 'center',
            }}
          />
          <Stack.Screen
            name="TeamMake"
            component={TeamMakeScreen}
            options={{
              title: '팀 만들기',
              headerBackTitle: '',
              headerTitleAlign: 'center',
            }}
          />
          <Stack.Screen
            name="MatchingDetail"
            component={MatchingDetailScreen}
            options={{
              title: '팀 찾기',
              headerBackTitle: '',
              headerTitleAlign: 'center',
            }}
          />
          
          {/* MyPage 관련 스크린들 추가 */}
          <Stack.Screen
            name="MyPage2"
            component={MyPage2}
            options={{
              headerShown: false, // MyPage2에서 자체 헤더를 사용
            }}
          />
          <Stack.Screen
            name="MyPage3"
            component={MyPage3}
            options={{
              headerShown: false, // MyPage3에서 자체 헤더를 사용
            }}
          />
          <Stack.Screen
            name="MyPage4"
            component={MyPage4}
            options={{
              headerShown: false, // MyPage4에서 자체 헤더를 사용
            }}
          />
          <Stack.Screen
          name="TodoScreen"
          component={TodoScreen}
          options={{
            title: '할 일 추가',
            headerBackTitle: '',
            headerTitleAlign: 'center',
          }}
         />
          <Stack.Screen
            name="TodoTeamScreen"
            component={TodoTeamScreen}
            options={{
              title: '팀원 할 일',
              headerBackTitle: '',
              headerTitleAlign: 'center',
            }}
          />
          <Stack.Screen
            name="ActivitySettingScreen"
            component={ActivitySettingScreen}
            options={{
              title: '활동 편집',
              headerBackTitle: '',
              headerTitleAlign: 'center',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

// BottomTab 네비게이터 ParamList
export type BottomTabParamList = {
  Home: undefined;
  Info: undefined;
  Activity: undefined;
  Benefit: undefined;
  MyPage: undefined;
};