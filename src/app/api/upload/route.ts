import { NextRequest, NextResponse } from 'next/server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const { files } = await request.json();

        if (!files || !Array.isArray(files)) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        // Base64 파일들을 Firebase Storage에 업로드
        const uploadPromises = files.map(async (fileData: { name: string; data: string }) => {
            // Base64 데이터를 Buffer로 변환
            const base64Data = fileData.data.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');

            // Firebase Storage에 업로드
            const fileRef = ref(storage, `abuse_reports/${Date.now()}_${fileData.name}`);
            const snapshot = await uploadBytes(fileRef, buffer);

            // 다운로드 URL 반환
            return await getDownloadURL(snapshot.ref);
        });

        const urls = await Promise.all(uploadPromises);

        return NextResponse.json({ urls });

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: '업로드 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
