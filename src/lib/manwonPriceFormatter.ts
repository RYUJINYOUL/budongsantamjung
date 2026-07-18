/** 만원 단위 입력 → 한글 금액 표기 (억/만원) — Flutter ManwonPriceFormatter와 동일 */
export type TransactionType = '매매' | '전세' | '월세';
function comma(n: number): string {
    return n.toLocaleString('ko-KR');
}

export function formatFromManwon(man: number | ''): string {
    if (man === '' || man === 0) return '';
    const won = man * 10000;
    if (won >= 100_000_000) {
        const eok = Math.floor(won / 100_000_000);
        const restWon = won % 100_000_000;
        if (restWon >= 10_000) {
            const restMan = Math.round(restWon / 10_000);
            return `${eok}억 ${comma(restMan)}만원`;
        }
        return `${eok}억`;
    }
    return `${comma(man)}만원`;
}

export function primaryPricePreview(
    transactionType: TransactionType,
    salePrice: number | '',
    deposit: number | '',
    monthlyRent: number | '',
): string {
    switch (transactionType) {
        case '매매':
            return formatFromManwon(salePrice);
        case '전세':
            return formatFromManwon(deposit);
        case '월세': {
            const dep = formatFromManwon(deposit);
            const rent = formatFromManwon(monthlyRent);
            if (!dep && !rent) return '';
            if (!dep) return `월 ${rent}`;
            if (!rent) return dep;
            return `${dep} · 월 ${rent}`;
        }
        default:
            return '';
    }
}
