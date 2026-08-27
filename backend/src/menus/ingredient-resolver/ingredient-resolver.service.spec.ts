import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Allergy, Ingredient, IngredientAllergy } from '../../entities';
import { VisionAiService } from '../vision-ai/vision-ai.service';
import { IngredientResolverService } from './ingredient-resolver.service';

// 실제 DB 없이 정규화 일관성만 검증하기 위한 인메모리 가짜 Ingredient 리포지토리.
// findOne/save의 "상태를 유지하는" 동작을 그대로 모사해야, 두 번째 호출이 첫 번째 호출의 결과를 재사용하는지 확인할 수 있다.
class FakeIngredientRepository {
  private rows: Ingredient[] = [];
  private nextId = 1;

  async findOne({ where: { name } }: { where: { name: string } }): Promise<Ingredient | null> {
    return this.rows.find((row) => row.name === name) ?? null;
  }

  create(partial: Partial<Ingredient>): Ingredient {
    return { ...partial } as Ingredient;
  }

  async save(entity: Ingredient): Promise<Ingredient> {
    const saved: Ingredient = { ...entity, ingredientId: this.nextId++, createdAt: new Date() };
    this.rows.push(saved);
    return saved;
  }
}

describe('IngredientResolverService - 재료명 정규화 일관성', () => {
  let service: IngredientResolverService;
  let classifyIngredientAllergies: jest.Mock;
  let ingredientAllergySave: jest.Mock;

  beforeEach(async () => {
    classifyIngredientAllergies = jest.fn().mockResolvedValue({ reasoning: 'test', matchedCodes: [] });
    ingredientAllergySave = jest.fn().mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        IngredientResolverService,
        { provide: getRepositoryToken(Ingredient), useClass: FakeIngredientRepository },
        {
          provide: getRepositoryToken(IngredientAllergy),
          useValue: { save: ingredientAllergySave, create: (v: unknown) => v },
        },
        { provide: getRepositoryToken(Allergy), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: VisionAiService, useValue: { classifyIngredientAllergies } },
      ],
    }).compile();

    service = moduleRef.get(IngredientResolverService);
  });

  it('공백 표기만 다른 재료명은 같은 Ingredient row로 귀결되고, 신규 row는 최초 1회만 생성된다', async () => {
    const first = await service.resolveIngredient('돼지 고기');
    const second = await service.resolveIngredient('돼지고기');
    const third = await service.resolveIngredient(' 돼지  고기 ');

    expect(first.name).toBe('돼지고기');
    expect(second.ingredientId).toBe(first.ingredientId);
    expect(third.ingredientId).toBe(first.ingredientId);

    // 신규 재료로 취급된 건 최초 1번뿐이어야 하므로, AI 알러지 분류 호출도 정확히 1번만 일어나야 한다.
    expect(classifyIngredientAllergies).toHaveBeenCalledTimes(1);
  });

  it('실제로 다른 재료명은 서로 다른 Ingredient row로 생성된다', async () => {
    const pork = await service.resolveIngredient('돼지고기');
    const shrimp = await service.resolveIngredient('새우');

    expect(pork.ingredientId).not.toBe(shrimp.ingredientId);
    expect(classifyIngredientAllergies).toHaveBeenCalledTimes(2);
  });
});
