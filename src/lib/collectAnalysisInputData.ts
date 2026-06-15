import type { TransactionType } from './manwonPriceFormatter';

export interface AnalysisDetailInput {
    transactionType: TransactionType;
    salePrice: number | '';
    deposit: number | '';
    monthlyRent: number | '';
    premium: number | '';
    currentBusiness: string;
    desiredBusiness: string;
    monthlyRevenue: number | '';
    monthlyProfit: number | '';
    floor: number | string | '';
    area: number | string | '';
    totalDeposit: number | '';
    totalMonthlyRent: number | '';
}

export const defaultAnalysisDetailInput = (): AnalysisDetailInput => ({
    transactionType: '매매',
    salePrice: '',
    deposit: '',
    monthlyRent: '',
    premium: '',
    currentBusiness: '',
    desiredBusiness: '',
    monthlyRevenue: '',
    monthlyProfit: '',
    floor: '',
    area: '',
    totalDeposit: '',
    totalMonthlyRent: '',
});

const toWon = (v: number | '') => (v !== '' ? Number(v) * 10000 : null);

/** DB floor(INT) — 순수 숫자만. "4층", "고층" 등은 null → 전송 제외 */
export function toDbSafeFloor(floor: number | string | ''): number | null {
    if (floor === '') return null;
    if (typeof floor === 'number' && Number.isFinite(floor)) return Math.trunc(floor);
    const str = String(floor).trim();
    if (/^\d+$/.test(str)) return Number(str);
    return null;
}

/** Flutter _collectUserInputData 와 동일 */
export function collectAnalysisInputData(
    category: string,
    input: AnalysisDetailInput,
): Record<string, unknown> {
    const data: Record<string, unknown> = {
        transactionType: input.transactionType,
    };

    if (input.transactionType === '매매' && input.salePrice !== '') {
        data.price = toWon(input.salePrice);
    } else if (
        (input.transactionType === '전세' || input.transactionType === '월세') &&
        input.deposit !== ''
    ) {
        data.deposit = toWon(input.deposit);
    }

    if (input.transactionType === '월세' && input.monthlyRent !== '') {
        data.monthlyRent = toWon(input.monthlyRent);
    }

    const dbFloor = toDbSafeFloor(input.floor);
    if (dbFloor !== null) data.floor = dbFloor;
    if (input.area !== '') {
        const parsed = Number(input.area);
        if (!isNaN(parsed)) data.area = parsed;
    }

    if (category === 'store') {
        if (input.premium !== '') data.premium = toWon(input.premium);
        if (input.currentBusiness) data.currentBusiness = input.currentBusiness;
        if (input.desiredBusiness) data.desiredBusiness = input.desiredBusiness;
        if (input.monthlyRevenue !== '') data.monthly_revenue = toWon(input.monthlyRevenue);
        if (input.monthlyProfit !== '') data.monthly_profit = toWon(input.monthlyProfit);
    }

    if (category === 'building') {
        if (input.totalDeposit !== '') data.totalDeposit = toWon(input.totalDeposit);
        if (input.totalMonthlyRent !== '') data.totalMonthlyRent = toWon(input.totalMonthlyRent);
    }

    return data;
}
