export type HouseholdRole = 'admin' | 'member';

export interface HouseholdPerson {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: HouseholdRole;
  joinedAt: string;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  inviteLink: string;
  myId: string;
  myRole: HouseholdRole;
  maxMembers: number;
  members: HouseholdPerson[];
}
