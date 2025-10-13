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

  // Activity 관련
  ActivityScreen: undefined;
  ActivitySettingScreen: { teamId?: number }; // 여기에 추가
  NotificationScreen: undefined;
  TodoScreen: { teamId?: number | null };
  TodoTeamScreen: undefined;
  ActivityGoalsScreen: undefined;

  PortfolioListScreen: undefined;
  PortfolioScreen: { portfolioId: number }; // 상세 페이지도 나중에 연결할 경우 대비
};
