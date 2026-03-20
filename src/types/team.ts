export type TeamRole = "Sales" | "Engineer" | "Admin";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  phone?: string | null;
  active: boolean;
  createdAt: string;
}

export interface CreateTeamMemberInput {
  name: string;
  email: string;
  role: TeamRole;
  phone?: string | null;
}

export interface UpdateTeamMemberInput {
  name?: string;
  email?: string;
  role?: TeamRole;
  phone?: string | null;
  active?: boolean;
}
