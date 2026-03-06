export interface AdminStats {
  totalUsers: number;
  totalTeams: number;
  totalAdmins: number;
  recentSignups: number;
}

export interface AdminUserTeam {
  teamId: string;
  teamNumber: number;
  name: string;
  role: string;
}

export interface AdminUserListItem {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  teams: AdminUserTeam[];
}

export interface AdminUserListResponse {
  users: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
}
