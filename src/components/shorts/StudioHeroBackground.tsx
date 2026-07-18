'use client';

type StudioHeroBackgroundProps = {
    heroImageUrl: string;
};

export default function StudioHeroBackground({ heroImageUrl }: StudioHeroBackgroundProps) {
    const encodedUrl = encodeURI(heroImageUrl);

    return (
        <>
            <div
                className="absolute inset-0 pointer-events-none bg-cover bg-center scale-105"
                style={{ backgroundImage: `url("${encodedUrl}")`, opacity: 0.36 }}
                aria-hidden
            />
            <div className="absolute inset-0 pointer-events-none bg-[#06080c]/45" aria-hidden />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `
                        radial-gradient(ellipse 120% 80% at 10% 20%, rgba(14,165,233,0.18) 0%, transparent 55%),
                        radial-gradient(ellipse 100% 70% at 90% 75%, rgba(52,211,153,0.14) 0%, transparent 50%),
                        linear-gradient(165deg, rgba(6,8,12,0.55) 0%, rgba(10,16,24,0.45) 45%, rgba(8,18,16,0.5) 100%)
                    `,
                }}
            />
            <div
                className="absolute inset-0 opacity-[0.07] pointer-events-none"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                        -12deg,
                        transparent,
                        transparent 48px,
                        rgba(255,255,255,0.5) 48px,
                        rgba(255,255,255,0.5) 49px
                    )`,
                }}
            />
        </>
    );
}
