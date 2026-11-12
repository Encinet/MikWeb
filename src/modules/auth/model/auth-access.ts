export function isStaffRole(role: unknown): role is 'moderator' | 'custodian' {
  return role === 'moderator' || role === 'custodian';
}

export function isMemberRole(role: unknown): role is 'member' | 'moderator' | 'custodian' {
  return role === 'member' || isStaffRole(role);
}
