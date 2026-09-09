export type Role = "owner" | "admin" | "member";
export type MemberStatus = "active" | "invited";
export type TeamMember = { id: string; name: string; email: string; role: Role; status: MemberStatus };

export const ROLES: Role[] = ["owner", "admin", "member"];
export const MEMBER_STATUSES: MemberStatus[] = ["active", "invited"];

let n = 0;
const m = (name: string, role: Role, status: MemberStatus): TeamMember => ({
  id: `mem-${(n += 1)}`,
  name,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@team.dev`,
  role,
  status,
});

export const TEAM: TeamMember[] = [
  m("Ada Lovelace", "owner", "active"),
  m("Alan Turing", "admin", "active"),
  m("Grace Hopper", "admin", "active"),
  m("Katherine Johnson", "member", "active"),
  m("Margaret Hamilton", "member", "active"),
  m("Barbara Liskov", "member", "invited"),
  m("Donald Knuth", "member", "active"),
  m("Radia Perlman", "member", "invited"),
];
