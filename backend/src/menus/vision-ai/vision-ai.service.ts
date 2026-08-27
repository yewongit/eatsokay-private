import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IngredientAllergyClassificationResult,
  MenuIngredientInferenceResult,
  VisionAnalysisResult,
} from './vision-ai.types';

// 이미지 → 메뉴 항목 추출을 위한 시스템 프롬프트. 메뉴판 여부 판별과 한글/영문 메뉴명 JSON 배열 반환을 지시한다.
const MENU_ANALYSIS_SYSTEM_PROMPT = `너는 음식점 메뉴판 분석 전문가야. 입력된 이미지가 음식점 메뉴판인지 판별해.
메뉴판이 아니거나 글자를 읽을 수 없다면 is_menu: false와 사유(reason)를 반환해.
메뉴판이 맞다면 쪼개진 단어를 하나의 대표 메뉴명으로 결합하고 한글 원문(originalNameKo)과 영문 번역명(translatedNameEn)의 JSON 배열로 반환해.

반드시 다음 JSON 형식으로만 응답해. 다른 설명 텍스트는 포함하지 마:
{
  "isMenu": boolean,
  "reason": string | null,
  "items": [ { "originalNameKo": string, "translatedNameEn": string } ]
}`;

// DB에 없는 신규 메뉴의 대표 재료를 추론하기 위한 시스템 프롬프트 (menu-matching의 AI fallback 1단계에서 사용)
// AI는 알레르기를 직접 판단하지 않고 "재료가 뭔지"만 추론한다 - 알레르기 판정은 항상 ingredient_allergy 사전을 거침
const MENU_TO_INGREDIENTS_SYSTEM_PROMPT = `너는 한국 음식 조리법 전문가야. 주어진 메뉴명을 보고 이 요리에 통상적으로 사용되는 대표 원재료를 추론해.

규칙:
1. 조리 과정을 단계적으로 떠올리며(Chain of Thought) 핵심 재료를 추론하고, 추론 과정을 "reasoning" 필드에 1~2문장으로 요약해.
2. 소금, 물, 식용유처럼 알레르기 판단에 의미 없는 범용 재료는 제외해.
3. 재료명은 표준적인 한 단어/짧은 명사로 정규화해(예: "잘게 썬 돼지고기" → "돼지고기"). 조리법·형태 수식어는 제거해.
4. 핵심 재료만 3~8개 선정하고, 확신이 없는 재료는 포함하지 마.
5. 반드시 다음 JSON 형식으로만 응답해. 다른 설명 텍스트는 포함하지 마:
{ "reasoning": string, "ingredients": string[] }`;

// 시스템 전체에서 처음 등장한 신규 재료 하나를 22종 알레르기로 분류하기 위한 시스템 프롬프트.
// 이 결과는 ingredient_allergy 테이블에 영구 캐싱되어 이후 동일 재료가 등장하는 모든 메뉴에 재사용된다.
const INGREDIENT_TO_ALLERGY_SYSTEM_PROMPT = `너는 식품 알레르기 분류 전문가야. 주어진 재료 하나가 식약처 지정 22종 알레르기 유발물질 중 어디에 해당하는지 판별해.

사용 가능한 코드: EGG, MILK, BUCKWHEAT, PEANUT, SOYBEAN, WHEAT, MACKEREL, CRAB, SHRIMP, PORK, PEACH, TOMATO, SULFITES, WALNUT, CHICKEN, BEEF, SQUID, SHELLFISH, PINE_NUT, CHESTNUT, ALMOND, ETC

규칙:
1. 이 매핑 결과는 앞으로 이 재료가 등장하는 모든 메뉴에 영구적으로 재사용된다. 확실한 근거가 있을 때만 코드를 포함해.
2. 재료 자체가 알레르기 원료인 경우만 매핑해(예: "새우" → SHRIMP). 조리 중 우연한 교차오염은 고려하지 마.
3. 해당하는 알레르기가 없으면 빈 배열을 반환해. 추측성 매핑을 만들지 마.
4. 판단 근거를 "reasoning" 필드에 한 문장으로 남겨.
5. 반드시 다음 JSON 형식으로만 응답해. 다른 설명 텍스트는 포함하지 마:
{ "reasoning": string, "matchedCodes": string[] }`;

// AWS Bedrock Messages API 응답의 최소 구조 (content 블록 배열 중 text 타입을 파싱해서 사용)
interface BedrockContentBlock {
  type: string;
  text?: string;
}

interface BedrockInvokeResponse {
  content: BedrockContentBlock[];
  stop_reason?: string;
}

/**
 * 외부 AI 연동 계층(Vision AI).
 * AWS Bedrock(Claude)에 메뉴판 이미지를 전송해 메뉴명을 추출한다.
 * DB 매칭에 실패한 신규 메뉴/재료에 대해서는 "재료 추론"과 "재료의 알레르기 분류"만 요청하며,
 * "이 메뉴에 알레르기가 있는가"를 AI에게 직접 묻지 않는다(환각 위험을 최소화하기 위한 역할 분리).
 */
@Injectable()
export class VisionAiService {
  private readonly region: string;
  private readonly bearerToken: string;
  private readonly modelId: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.bearerToken = this.configService.get<string>('AWS_BEARER_TOKEN_BEDROCK', '');
    this.modelId = this.configService.get<string>('BEDROCK_MODEL_ID', 'us.anthropic.claude-sonnet-5');
  }

  async analyzeMenuImage(imageBuffer: Buffer, mimeType: string): Promise<VisionAnalysisResult> {
    const response = await this.invoke({
      max_tokens: 8192,
      system: MENU_ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBuffer.toString('base64'),
              },
            },
            {
              type: 'text',
              text: '이 이미지를 분석해서 JSON으로만 응답해줘.',
            },
          ],
        },
      ],
    });

    return this.parseJsonResponse<VisionAnalysisResult>(response);
  }

  // AI 추론 파이프라인 1단계: 메뉴명 → 대표 재료 목록 (메뉴당 1회 호출)
  async inferMenuIngredients(menuName: string): Promise<MenuIngredientInferenceResult> {
    const response = await this.invoke({
      max_tokens: 512,
      system: MENU_TO_INGREDIENTS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `메뉴명: "${menuName}"\n이 메뉴의 대표 원재료를 JSON으로만 응답해줘.`,
        },
      ],
    });

    return this.parseJsonResponse<MenuIngredientInferenceResult>(response);
  }

  // AI 추론 파이프라인 2단계: 신규 재료명 → 22종 알레르기 코드 (재료당 시스템 전체에서 1회만 호출)
  async classifyIngredientAllergies(ingredientName: string): Promise<IngredientAllergyClassificationResult> {
    const response = await this.invoke({
      max_tokens: 512,
      system: INGREDIENT_TO_ALLERGY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `재료명: "${ingredientName}"\n이 재료가 해당하는 알레르기 코드를 JSON으로만 응답해줘.`,
        },
      ],
    });

    return this.parseJsonResponse<IngredientAllergyClassificationResult>(response);
  }

  // Bedrock InvokeModel REST API를 직접 호출 (SDK 미사용, Bearer 토큰 인증)
  private async invoke(body: Record<string, unknown>): Promise<BedrockInvokeResponse> {
    const url = `https://bedrock-runtime.${this.region}.amazonaws.com/model/${encodeURIComponent(this.modelId)}/invoke`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ anthropic_version: 'bedrock-2023-05-31', ...body }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bedrock invoke 실패 (${response.status}): ${errorText}`);
    }

    return (await response.json()) as BedrockInvokeResponse;
  }

  // 모델 응답 텍스트에서 JSON 부분만 추출해 파싱 (```json 코드블록으로 감싸져 오는 경우까지 방어적으로 처리)
  private parseJsonResponse<T>(response: BedrockInvokeResponse): T {
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock?.text) {
      throw new Error('Vision AI 응답에서 텍스트를 찾을 수 없습니다.');
    }

    const raw = textBlock.text.trim();
    // 코드블록(```json ... ```)으로 감싸져 있으면 펜스를 제거
    const fenced = raw.startsWith('```')
      ? raw.replace(/^```(json)?/, '').replace(/```$/, '').trim()
      : raw;

    // 앞뒤에 설명 텍스트가 섞여 와도 최외곽 중괄호 구간만 잘라내 JSON.parse 대상으로 사용
    const firstBrace = fenced.indexOf('{');
    const lastBrace = fenced.lastIndexOf('}');
    const jsonText = firstBrace >= 0 && lastBrace > firstBrace ? fenced.slice(firstBrace, lastBrace + 1) : fenced;

    try {
      return JSON.parse(jsonText) as T;
    } catch (error) {
      if (response.stop_reason === 'max_tokens') {
        throw new Error('Vision AI 응답이 max_tokens 제한으로 잘렸습니다. max_tokens를 늘려주세요.');
      }
      throw error;
    }
  }
}
