import { config, hasApiKey } from '../../config';
import { GEMINI_RESPONSE_SCHEMA, type GeminiFoodResult } from './schema';

export type GeminiErrorCode =
  | 'no_api_key'
  | 'rate_limited' // every model in the chain hit 429/quota
  | 'network'
  | 'bad_response'
  | 'unknown';

export class GeminiError extends Error {
  code: GeminiErrorCode;
  constructor(code: GeminiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'GeminiError';
  }
}

type Img = { base64: string; mimeType: string };

function buildBody(img: Img, prompt: string) {
  return {
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: img.mimeType, data: img.base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0.4,
    },
  };
}

function extractJsonText(payload: any): string | null {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const textPart = parts.find((p: any) => typeof p.text === 'string');
  return textPart?.text ?? null;
}

// Try each model in order; advance to the next on rate-limit (429). Returns the
// parsed result, or throws a GeminiError. `onModel` lets the UI show which model
// answered / that it's retrying.
export async function identifyWithGemini(
  img: Img,
  prompt: string,
  onModel?: (model: string, attempt: number) => void,
): Promise<{ result: GeminiFoodResult; model: string }> {
  if (!hasApiKey()) {
    throw new GeminiError('no_api_key', 'Chưa cấu hình Gemini API key.');
  }

  const models = config.geminiModels;
  let lastErr: GeminiError | null = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    onModel?.(model, i + 1);
    const url = `${config.geminiBaseUrl}/models/${model}:generateContent?key=${config.geminiApiKey}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(img, prompt)),
      });
    } catch (e: any) {
      lastErr = new GeminiError('network', 'Lỗi kết nối mạng. Kiểm tra Internet.');
      continue; // network hiccup — try the next model too
    }

    if (res.status === 429) {
      lastErr = new GeminiError('rate_limited', `Model ${model} đã hết hạn mức (429).`);
      continue; // rate-limited: fall back to the next model
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // 400/403 usually mean bad key or unsupported model — try next, keep error.
      lastErr = new GeminiError(
        res.status === 400 || res.status === 403 ? 'bad_response' : 'unknown',
        `Lỗi ${res.status} từ ${model}: ${text.slice(0, 200)}`,
      );
      continue;
    }

    const payload = await res.json().catch(() => null);
    const jsonText = extractJsonText(payload);
    if (!jsonText) {
      lastErr = new GeminiError('bad_response', `Phản hồi không hợp lệ từ ${model}.`);
      continue;
    }

    try {
      const result = JSON.parse(jsonText) as GeminiFoodResult;
      return { result, model };
    } catch {
      lastErr = new GeminiError('bad_response', `Không phân tích được JSON từ ${model}.`);
      continue;
    }
  }

  throw (
    lastErr ?? new GeminiError('unknown', 'Không nhận diện được (không rõ lý do).')
  );
}
