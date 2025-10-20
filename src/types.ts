// src/types.ts
export interface User {
  id: number;
  email: string;
  name: string;
  department?: string;
  studentId?: string;
  birth?: string;
  profile_picture?: string;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: { screen?: string; params?: any };
  InfoDetail: undefined;
  Settings: { user: User };
  Evaluation: undefined;
  TeamFind: undefined;
  Notifications: undefined;
  MakeTeam: undefined;
  MatchingDetail: undefined;
  MyPage2: { user: User };
  MyPage3: {
    user: User;
    selectedMember: {
      id: number;
      name: string;
      department: string;
      activity_id: number;
      activity_title: string;
    };
  };
  MyPage4: { user: User };
  PortfolioListScreen: undefined;
  PortfolioScreen: { portfolioId: number };
  PasswordResetScreen: undefined;

  // Activity 관련
  ActivityScreen: undefined;
  ActivitySettingScreen: { teamId?: number }; // 여기에 추가
  NotificationScreen: undefined;
  TodoScreen: { teamId?: number | null };
  TodoTeamScreen: undefined;
  ActivityGoalsScreen: { teamId?: number | null } | undefined;
};

export type BottomTabParamList = {
  홈: undefined;
  정보: undefined;
  활동: undefined;
  매칭: undefined;
  마이페이지: undefined;
};
