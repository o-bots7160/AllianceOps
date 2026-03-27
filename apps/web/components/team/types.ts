export type TeamMemberRole = 'COACH' | 'MENTOR' | 'STUDENT';

export type TeamDetail = {
  id: string;
  teamNumber: number;
  name: string;
  members: Array<{
    id: string;
    role: TeamMemberRole;
    user: { id: string; displayName: string | null; email: string | null };
  }>;
};

export type JoinRequestItem = {
  id: string;
  status: string;
  createdAt: string;
  user: { id: string; displayName: string | null; email: string | null };
};
