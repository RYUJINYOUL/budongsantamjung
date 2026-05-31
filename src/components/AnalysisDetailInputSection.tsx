'use client';

import { useMemo, type ReactNode } from 'react';
import { primaryPricePreview } from '../lib/manwonPriceFormatter';
import type { AnalysisDetailInput } from '../lib/collectAnalysisInputData';
import {
    PANEL_SECTION_LABEL,
    PANEL_INPUT_WRAP,
    PANEL_INPUT,
    PANEL_HINT,
    PANEL_DIVIDER,
    panelChoiceBtn,
} from './analyzePanelFormStyles';

interface Props {
    category: string;
    input: AnalysisDetailInput;
    onChange: (patch: Partial<AnalysisDetailInput>) => void;
}

function PanelNumInput({
    value,
    onChange,
    placeholder,
}: {
    value: number | '';
    onChange: (v: number | '') => void;
    placeholder: string;
}) {
    return (
        <div className={PANEL_INPUT_WRAP}>
            <input
                type="text"
                inputMode="numeric"
                placeholder={placeholder}
                className={PANEL_INPUT}
                value={value}
                onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    onChange(val ? Number(val) : '');
                }}
            />
        </div>
    );
}

function PanelTextInput({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    return (
        <div className={PANEL_INPUT_WRAP}>
            <input
                type="text"
                placeholder={placeholder}
                className={PANEL_INPUT}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

function SubSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div>
            <p className={`${PANEL_SECTION_LABEL} mb-2.5`}>{title}</p>
            {children}
        </div>
    );
}

export default function AnalysisDetailInputSection({ category, input, onChange }: Props) {
    const isLand = category === 'land';
    const isStore = category === 'store';
    const isApartment = category === 'apartment';

    const pricePreview = useMemo(
        () =>
            primaryPricePreview(
                input.transactionType,
                input.salePrice,
                input.deposit,
                input.monthlyRent,
            ),
        [input.transactionType, input.salePrice, input.deposit, input.monthlyRent],
    );

    return (
        <div>
            <SubSection title="거래 유형">
                <div className="grid grid-cols-3 gap-1.5">
                    {(['매매', '전세', '월세'] as const).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => onChange({ transactionType: type })}
                            className={panelChoiceBtn(input.transactionType === type)}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </SubSection>

            <div className={PANEL_DIVIDER} />

            <SubSection title="가격 정보">
                {input.transactionType === '매매' && (
                    <>
                        <PanelNumInput
                            value={input.salePrice}
                            onChange={(v) => onChange({ salePrice: v })}
                            placeholder="매매가 입력 (만원)"
                        />
                        {pricePreview && <p className={PANEL_HINT}>{pricePreview}</p>}
                    </>
                )}
                {input.transactionType === '전세' && (
                    <>
                        <PanelNumInput
                            value={input.deposit}
                            onChange={(v) => onChange({ deposit: v })}
                            placeholder="전세보증금 (만원)"
                        />
                        {pricePreview && <p className={PANEL_HINT}>{pricePreview}</p>}
                    </>
                )}
                {input.transactionType === '월세' && (
                    <>
                        <div className="grid grid-cols-2 gap-1.5">
                            <PanelNumInput
                                value={input.deposit}
                                onChange={(v) => onChange({ deposit: v })}
                                placeholder="보증금 (만원)"
                            />
                            <PanelNumInput
                                value={input.monthlyRent}
                                onChange={(v) => onChange({ monthlyRent: v })}
                                placeholder="월세 (만원)"
                            />
                        </div>
                        {pricePreview && <p className={PANEL_HINT}>{pricePreview}</p>}
                    </>
                )}

                {isStore && (
                    <div className="mt-3 space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                            <PanelNumInput
                                value={input.premium}
                                onChange={(v) => onChange({ premium: v })}
                                placeholder="권리금 (만원)"
                            />
                            <PanelTextInput
                                value={input.currentBusiness}
                                onChange={(v) => onChange({ currentBusiness: v })}
                                placeholder="현재 업종"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            <PanelNumInput
                                value={input.monthlyRevenue}
                                onChange={(v) => onChange({ monthlyRevenue: v })}
                                placeholder="월매출 (만원)"
                            />
                            <PanelNumInput
                                value={input.monthlyProfit}
                                onChange={(v) => onChange({ monthlyProfit: v })}
                                placeholder="월수익 (만원)"
                            />
                        </div>
                    </div>
                )}
            </SubSection>

            {!isLand && (
                <>
                    <div className={PANEL_DIVIDER} />
                    <SubSection title="층수 / 면적">
                        <div className={`${isApartment ? 'grid grid-cols-2 gap-1.5' : 'space-y-1.5'}`}>
                            <PanelNumInput
                                value={input.floor}
                                onChange={(v) => onChange({ floor: v })}
                                placeholder="층수"
                            />
                            <div className={PANEL_INPUT_WRAP}>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="전용면적 (㎡)"
                                    className={PANEL_INPUT}
                                    value={input.area}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9.]/g, '');
                                        onChange({ area: val === '' ? '' : Number(val) });
                                    }}
                                />
                            </div>
                        </div>
                    </SubSection>
                </>
            )}
        </div>
    );
}
