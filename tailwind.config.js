/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'noto-sans-kr': ['var(--font-noto-sans-kr)', 'Noto Sans KR', 'sans-serif'],
      },
      // 본고딕(Noto Sans KR)은 같은 숫자보다 두껍게 보임 → Tailwind 기본값 사용 + 굵은 클래스만 전역 보정
      fontWeight: {
        extrabold: '700',
        black: '700',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
