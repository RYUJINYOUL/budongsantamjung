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
    floor: number | '';
    area: number | '';
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
});

const toWon = (v: number | '') => (v !== '' ? Number(v) * 10000 : null);

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

    if (input.floor !== '') data.floor = Number(input.floor);
    if (input.area !== '') data.area = Number(input.area);

    if (category === 'store') {
        if (input.premium !== '') data.premium = toWon(input.premium);
        if (input.currentBusiness) data.currentBusiness = input.currentBusiness;
        if (input.desiredBusiness) data.desiredBusiness = input.desiredBusiness;
        if (input.monthlyRevenue !== '') data.monthly_revenue = toWon(input.monthlyRevenue);
        if (input.monthlyProfit !== '') data.monthly_profit = toWon(input.monthlyProfit);
    }

    return data;
}
