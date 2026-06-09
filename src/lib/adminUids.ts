/** 관리자 전용 기능 접근 허용 UID */
export const ADMIN_UIDS = new Set([
  'FsB5czCb2UcowruDPk0EBcPitWB2',
  '0aez3IDXppSP2WzDLGxJQ6XwnbJ2',
  ...(process.env.NEXT_PUBLIC_DEV_UID ? [process.env.NEXT_PUBLIC_DEV_UID] : []),
  ...(process.env.NEXT_PUBLIC_DEV_UID2 ? [process.env.NEXT_PUBLIC_DEV_UID2] : []),
]);

export function isAdminUser(uid: string | null | undefined): boolean {
  if (!uid) return false;
  return ADMIN_UIDS.has(uid);
}
