import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'

// Firebase 초기화 (서버 사이드)
const firebaseConfig = {
    apiKey: "AIzaSyDrdm9iLABioN9GE7yRi_8M7jgYP0DSVxU",
    authDomain: "route-test-fe6fc.firebaseapp.com",
    projectId: "route-test-fe6fc",
    storageBucket: "route-test-fe6fc.firebasestorage.app",
    messagingSenderId: "790621700166",
    appId: "1:790621700166:web:4527fd2fa01d5bb1504a47"
}

// Firebase 초기화 함수
function getFirebaseApp() {
    try {
        if (getApps().length === 0) {
            return initializeApp(firebaseConfig)
        } else {
            return getApps()[0]
        }
    } catch (error) {
        console.error('Firebase 초기화 오류:', error)
        throw error
    }
}

function getFirestoreDB() {
    try {
        const app = getFirebaseApp()
        return getFirestore(app)
    } catch (error) {
        console.error('Firestore 초기화 오류:', error)
        throw error
    }
}

export async function GET(request: NextRequest) {
    try {
        console.log('타임라인 조회 시작')

        const db = getFirestoreDB()
        const searchParams = request.nextUrl.searchParams
        const limitCount = parseInt(searchParams.get('limit') || '50')

        console.log('Firestore 쿼리 준비:', { limitCount })

        // 최신순으로 정렬하여 가져오기
        const q = query(
            collection(db, 'analyses'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        )

        console.log('Firestore 쿼리 실행 중...')
        const querySnapshot = await getDocs(q)
        console.log('쿼리 결과:', querySnapshot.size, '개 문서')

        const analyses = querySnapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString()
            }
        })

        console.log('타임라인 조회 성공:', analyses.length, '개 항목')
        return NextResponse.json({ analyses })

    } catch (error: any) {
        console.error('타임라인 조회 오류 상세:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        })

        return NextResponse.json(
            {
                error: '타임라인을 불러오는 중 오류가 발생했습니다.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        )
    }
}

// Vercel 배포를 위한 설정
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
