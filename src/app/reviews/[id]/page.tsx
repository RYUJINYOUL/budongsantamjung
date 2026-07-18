'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';
import SideNav from '../../../components/SideNav';
import BrandSidePanel from '../../../components/BrandSidePanel';
import {
  PANEL_SECTION_DESC,
  PAGE_HEADER_TITLE,
  PAGE_STICKY_HEADER,
  PAGE_SUBHEADER,
  PAGE_SUBHEADER_TITLE,
} from '../../../components/analyzePanelFormStyles';
import { auth } from '../../../lib/firebase';
import {
  addReviewComment,
  deleteReviewComment,
  deleteReviewPost,
  fetchReviewComments,
  fetchReviewPost,
  type ReviewComment,
  type ReviewPost,
} from '../../../lib/communityReviews';

function formatDate(d: Date | null) {
  if (!d) return '';
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [post, setPost] = useState<ReviewPost | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([fetchReviewPost(postId), fetchReviewComments(postId)]);
      if (!p) {
        setError('리뷰를 찾을 수 없습니다.');
        return;
      }
      setPost(p);
      setComments(c);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    if (!reply.trim() || !postId) return;
    setSubmitting(true);
    try {
      await addReviewComment(user, postId, reply);
      setReply('');
      const c = await fetchReviewComments(postId);
      setComments(c);
      setPost(prev => prev ? { ...prev, commentCount: (prev.commentCount ?? 0) + 1 } : prev);
    } catch {
      alert('답글 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !confirm('이 리뷰를 삭제할까요?')) return;
    try {
      await deleteReviewPost(post.id);
      router.push('/reviews');
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!postId || !confirm('답글을 삭제할까요?')) return;
    try {
      await deleteReviewComment(postId, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setPost(prev => prev ? { ...prev, commentCount: Math.max(0, (prev.commentCount ?? 1) - 1) } : prev);
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="detective-bg min-h-screen text-slate-900 relative bg-white flex">
      <div className="noise-overlay" />
      <div className="scanline" />
      <SideNav />

      <div className="lg:pl-16 flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(0,25%)_minmax(0,75%)] min-h-screen">
        {/* ── 좌측: 브랜드 패널 ── */}
        <div className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen min-w-0 border-r border-emerald-800/20">
          <BrandSidePanel className="w-full" showHomeLink />
        </div>

        {/* ── 우측: 리뷰 상세 ── */}
        <div className="flex flex-col h-auto lg:h-screen overflow-hidden bg-slate-50/50 min-w-0">
          <header className={PAGE_STICKY_HEADER}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 lg:hidden shrink-0" />
              <Link
                href="/reviews"
                className="p-1.5 -ml-1 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors shrink-0 lg:hidden"
                aria-label="리뷰 목록"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className={PAGE_HEADER_TITLE}>리뷰</h1>
            </div>
          </header>
          <div className={PAGE_SUBHEADER}>
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/reviews"
                className="hidden lg:flex p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
                aria-label="리뷰 목록"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <h2 className={PAGE_SUBHEADER_TITLE}>리뷰 상세</h2>
                <p className={PANEL_SECTION_DESC}>이용 후기와 답글</p>
              </div>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 pb-24">
          {loading ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-100 border-t-emerald-500 animate-spin" />
            </div>
          ) : error || !post ? (
            <div className="text-center py-16">
              <p className="text-rose-500 font-bold text-sm mb-4">{error || '리뷰 없음'}</p>
              <Link href="/reviews" className="text-emerald-600 text-sm font-bold underline">
                목록으로
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <article className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-lg font-black text-slate-900 leading-tight">{post.title}</h2>
                  {post.rating != null && post.rating > 0 && (
                    <span className="shrink-0 text-amber-400 text-sm font-bold">
                      {'★'.repeat(post.rating)}{'☆'.repeat(5 - post.rating)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">{post.content}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                  <span>
                    {post.authorName} · {formatDate(post.createdAt)}
                  </span>
                  {user?.uid === post.authorId && (
                    <button
                      type="button"
                      onClick={handleDeletePost}
                      className="text-rose-400 hover:text-rose-600 font-bold"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </article>

              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-extrabold text-slate-800 mb-4">
                  답글 {comments.length}
                </h3>

                {comments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">아직 답글이 없습니다.</p>
                ) : (
                  <ul className="space-y-3 mb-5">
                    {comments.map(c => (
                      <li key={c.id} className="bg-slate-50/80 border border-slate-100 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold text-slate-700">{c.authorName}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                        {user?.uid === c.authorId && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            className="mt-2 text-[10px] font-bold text-slate-400 hover:text-rose-500"
                          >
                            삭제
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {user ? (
                  <form onSubmit={handleReply} className="space-y-2">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="답글을 입력하세요"
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 resize-none"
                    />
                    <button
                      type="submit"
                      disabled={submitting || !reply.trim()}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      {submitting ? '등록 중...' : '답글 등록'}
                    </button>
                  </form>
                ) : (
                  <p className="text-center text-xs text-slate-500 py-2">
                    <Link href="/login" className="text-emerald-600 font-bold underline">
                      로그인
                    </Link>
                    {' '}후 답글을 작성할 수 있습니다.
                  </p>
                )}
              </section>
            </div>
          )}
          </main>
        </div>
      </div>
    </div>
  );
}
