import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';

export const REVIEW_TYPE = 'review';

export interface ReviewPost {
  id: string;
  type: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string | null;
  title: string;
  content: string;
  rating?: number | null;
  createdAt: Date | null;
  commentCount?: number;
}

export interface ReviewComment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string | null;
  content: string;
  createdAt: Date | null;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function mapPost(id: string, data: Record<string, unknown>): ReviewPost {
  return {
    id,
    type: String(data.type ?? ''),
    authorId: String(data.authorId ?? ''),
    authorName: String(data.authorName ?? '익명'),
    authorPhoto: (data.authorPhoto as string | null | undefined) ?? null,
    title: String(data.title ?? ''),
    content: String(data.content ?? ''),
    rating: typeof data.rating === 'number' ? data.rating : null,
    createdAt: toDate(data.createdAt),
    commentCount: typeof data.commentCount === 'number' ? data.commentCount : 0,
  };
}

function mapComment(id: string, data: Record<string, unknown>): ReviewComment {
  return {
    id,
    authorId: String(data.authorId ?? ''),
    authorName: String(data.authorName ?? '익명'),
    authorPhoto: (data.authorPhoto as string | null | undefined) ?? null,
    content: String(data.content ?? ''),
    createdAt: toDate(data.createdAt),
  };
}

export async function fetchReviewPosts(mode: 'all' | 'mine', uid?: string): Promise<ReviewPost[]> {
  const col = collection(db, 'community');
  const q =
    mode === 'mine' && uid
      ? query(col, where('type', '==', REVIEW_TYPE), where('authorId', '==', uid), orderBy('createdAt', 'desc'))
      : query(col, where('type', '==', REVIEW_TYPE), orderBy('createdAt', 'desc'));

  const snap = await getDocs(q);
  return snap.docs.map(d => mapPost(d.id, d.data() as Record<string, unknown>));
}

export async function fetchReviewPost(postId: string): Promise<ReviewPost | null> {
  const snap = await getDoc(doc(db, 'community', postId));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  if (data.type !== REVIEW_TYPE) return null;
  return mapPost(snap.id, data);
}

export async function createReviewPost(
  user: User,
  input: { title: string; content: string; rating?: number | null }
) {
  return addDoc(collection(db, 'community'), {
    type: REVIEW_TYPE,
    authorId: user.uid,
    authorName: user.displayName || user.email?.split('@')[0] || '익명',
    authorPhoto: user.photoURL || null,
    title: input.title.trim(),
    content: input.content.trim(),
    rating: input.rating ?? null,
    createdAt: serverTimestamp(),
    commentCount: 0,
  });
}

export async function deleteReviewPost(postId: string) {
  await deleteDoc(doc(db, 'community', postId));
}

export async function fetchReviewComments(postId: string): Promise<ReviewComment[]> {
  const q = query(collection(db, 'community', postId, 'comments'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => mapComment(d.id, d.data() as Record<string, unknown>));
}

export async function addReviewComment(user: User, postId: string, content: string) {
  await addDoc(collection(db, 'community', postId, 'comments'), {
    authorId: user.uid,
    authorName: user.displayName || user.email?.split('@')[0] || '익명',
    authorPhoto: user.photoURL || null,
    content: content.trim(),
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'community', postId), {
    commentCount: increment(1),
  });
}

export async function deleteReviewComment(postId: string, commentId: string) {
  await deleteDoc(doc(db, 'community', postId, 'comments', commentId));
  await updateDoc(doc(db, 'community', postId), {
    commentCount: increment(-1),
  });
}

const FIRESTORE_CONSOLE_INDEXES =
  'https://console.firebase.google.com/project/yongcar-4377c/firestore/databases/tomtom/indexes';

/** Firestore failed-precondition(인덱스 필요) 오류에서 Console 생성 URL 추출 */
export function parseFirestoreIndexError(e: unknown): {
  message: string;
  indexUrl: string | null;
  isIndexError: boolean;
} {
  const raw =
    e instanceof Error
      ? e.message
      : typeof e === 'object' && e !== null && 'message' in e
        ? String((e as { message: unknown }).message)
        : String(e);

  const urlMatch = raw.match(/https:\/\/console\.firebase\.google\.com[^\s)\]"']+/);
  const isIndexError = /index|failed-precondition/i.test(raw);

  return {
    message: isIndexError
      ? 'Firestore 복합 인덱스가 필요합니다. 아래 링크에서 「만들기」를 눌러 주세요.'
      : raw || '리뷰를 불러오지 못했습니다.',
    indexUrl: urlMatch?.[0] ?? (isIndexError ? FIRESTORE_CONSOLE_INDEXES : null),
    isIndexError,
  };
}
