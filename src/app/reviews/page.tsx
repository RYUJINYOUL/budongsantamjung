'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import SideNav from '../../components/SideNav';
import BrandSidePanel from '../../components/BrandSidePanel';
import {
  PANEL_SECTION_DESC,
  PAGE_HEADER_TITLE,
  PAGE_STICKY_HEADER,
  PAGE_SUBHEADER,
  PAGE_SUBHEADER_TITLE,
} from '../../components/analyzePanelFormStyles';
import { auth } from '../../lib/firebase';
import {
  createReviewPost,
  deleteReviewPost,
  fetchReviewPosts,
  parseFirestoreIndexError,
  type ReviewPost,
} from '../../lib/communityReviews';

type ListTab = 'all' | 'mine';

function formatDate(d: Date | null) {
  if (!d) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-400 text-xs" aria-label={`${value}점`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n}>{n <= value ? '★' : '☆'}</span>
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState<ListTab>('all');
  const [posts, setPosts] = useState<ReviewPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indexUrl, setIndexUrl] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIndexUrl(null);
    try {
      const list = await fetchReviewPosts(tab, user?.uid);
      setPosts(list);
    } catch (e: unknown) {
      const parsed = parseFirestoreIndexError(e);
      setError(parsed.message);
      setIndexUrl(parsed.indexUrl);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [tab, user?.uid]);

  useEffect(() => {
    if (!authLoading) loadPosts();
  }, [authLoading, loadPosts]);

  useEffect(() => {
    if (tab === 'mine' && !user && !authLoading) {
      router.push('/login?return=/reviews');
    }
  }, [tab, user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login?return=/reviews');
      return;
    }
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const ref = await createReviewPost(user, { title, content, rating });
      setTitle('');
      setContent('');
      setRating(5);
      setShowForm(false);
      router.push(`/reviews/${ref.id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '리뷰 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('이 리뷰를 삭제할까요?')) return;
    try {
      await deleteReviewPost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
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

        {/* ── 우측: 리뷰 리스트 ── */}
        <div className="flex flex-col h-auto lg:h-screen overflow-hidden bg-slate-50/50 min-w-0">
          <header className={PAGE_STICKY_HEADER}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 lg:hidden shrink-0" />
                <h1 className={PAGE_HEADER_TITLE}>리뷰</h1>
              </div>
              {user && (
                <button
                  type="button"
                  onClick={() => setShowForm(v => !v)}
                  className="shrink-0 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  {showForm ? '닫기' : '+ 리뷰 작성'}
                </button>
              )}
            </div>
          </header>
          <div className={PAGE_SUBHEADER}>
            <h2 className={PAGE_SUBHEADER_TITLE}>이용 후기</h2>
            <p className={PANEL_SECTION_DESC}>부동산탐정 이용 후기를 남겨보세요</p>
          </div>

          <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 pb-24">
            <div className="flex gap-2 mb-4">
              {(['all', 'mine'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all ${tab === t ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'}`}
                >
                  {t === 'all' ? '전체 리뷰' : '내 리뷰'}
                </button>
              ))}
            </div>

            {showForm && user && (
              <form onSubmit={handleSubmit} className="mb-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">제목</label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="리뷰 제목"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
                    maxLength={80}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">별점</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className={`text-xl transition-colors ${n <= rating ? 'text-amber-400' : 'text-slate-200'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">내용</label>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="이용 경험을 자유롭게 작성해 주세요"
                    rows={5}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 resize-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all"
                >
                  {submitting ? '등록 중...' : '리뷰 등록'}
                </button>
              </form>
            )}

            {!user && !authLoading && (
              <div className="mb-5 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-center">
                <p className="text-sm text-slate-600 font-semibold mb-2">로그인 후 리뷰를 작성할 수 있습니다.</p>
                <Link href="/login?return=/reviews" className="inline-block px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl">
                  로그인
                </Link>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center py-20 gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-emerald-100 border-t-emerald-500 animate-spin" />
                <p className="text-xs font-bold text-emerald-600">불러오는 중...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                <p className="text-rose-500 text-sm font-bold">{error}</p>
                {indexUrl && (
                  <a
                    href={indexUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all break-all"
                  >
                    Firebase Console에서 인덱스 만들기 →
                  </a>
                )}
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  인덱스 생성 후 1~3분 뒤 「다시 시도」를 눌러 주세요.
                </p>
                <button type="button" onClick={loadPosts} className="text-xs font-bold text-emerald-600 underline">
                  다시 시도
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                <p className="text-slate-800 font-bold text-sm mb-1">
                  {tab === 'mine' ? '작성한 리뷰가 없습니다' : '아직 리뷰가 없습니다'}
                </p>
                <p className="text-xs text-slate-400">첫 번째 리뷰를 남겨보세요!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map(post => (
                  <article
                    key={post.id}
                    className="group bg-white border border-slate-100 hover:border-emerald-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
                  >
                    <Link href={`/reviews/${post.id}`} className="block">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h2 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1">
                          {post.title}
                        </h2>
                        {post.rating != null && post.rating > 0 && <StarRating value={post.rating} />}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">{post.content}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                        <span className="text-slate-600">{post.authorName}</span>
                        <span>·</span>
                        <span>{formatDate(post.createdAt)}</span>
                        {(post.commentCount ?? 0) > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-600">답글 {post.commentCount}</span>
                          </>
                        )}
                      </div>
                    </Link>
                    {user?.uid === post.authorId && (
                      <div className="mt-3 pt-2 border-t border-slate-50 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id)}
                          className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
