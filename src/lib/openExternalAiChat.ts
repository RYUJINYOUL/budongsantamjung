import { copyApartmentComparePrompt } from './apartmentComparePrompt';

export type ExternalAiChatProvider = 'chatgpt' | 'claude' | 'gemini';

type ProviderConfig = {
  label: string;
  baseUrl: string;
  /** URL ?q= 프리필 상한 (초과 시 base만 열고 클립보드 복사에 의존) */
  maxPrefillChars: number;
};

const PROVIDERS: Record<ExternalAiChatProvider, ProviderConfig> = {
  chatgpt: {
    label: 'ChatGPT',
    baseUrl: 'https://chatgpt.com/',
    maxPrefillChars: 6000,
  },
  claude: {
    label: 'Claude',
    baseUrl: 'https://claude.ai/new',
    maxPrefillChars: 1500,
  },
  gemini: {
    label: 'Gemini',
    baseUrl: 'https://gemini.google.com/app',
    maxPrefillChars: 1500,
  },
};

function buildProviderUrl(provider: ExternalAiChatProvider, prompt: string, prefill: boolean): string {
  const { baseUrl } = PROVIDERS[provider];
  if (!prefill || !prompt.trim()) return baseUrl;
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}q=${encodeURIComponent(prompt)}`;
}

export type OpenExternalAiChatResult = {
  label: string;
  copied: boolean;
  prefilled: boolean;
};

/** 프롬프트 복사 + 외부 AI 채팅 탭 열기 */
export async function openExternalAiChatWithPrompt(
  provider: ExternalAiChatProvider,
  prompt: string,
): Promise<OpenExternalAiChatResult> {
  const config = PROVIDERS[provider];
  const trimmed = prompt.trim();

  let copied = false;
  if (trimmed) {
    try {
      await copyApartmentComparePrompt(trimmed);
      copied = true;
    } catch {
      copied = false;
    }
  }

  const prefilled = trimmed.length > 0 && trimmed.length <= config.maxPrefillChars;
  const url = buildProviderUrl(provider, trimmed, prefilled);

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return { label: config.label, copied, prefilled };
}

export function externalAiChatToastMessage(result: OpenExternalAiChatResult): string {
  if (result.copied && result.prefilled) {
    return `${result.label} — 프롬프트 복사 · 입력창에 반영됨`;
  }
  if (result.copied) {
    return `${result.label} — 프롬프트 복사됨 · 붙여넣기(Cmd+V)`;
  }
  if (result.prefilled) {
    return `${result.label}가 열렸습니다`;
  }
  return `${result.label}가 열렸습니다 · 프롬프트는 다운로드(↓)에서 확인`;
}
