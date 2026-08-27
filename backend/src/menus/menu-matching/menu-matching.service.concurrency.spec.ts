import { DataSource, Repository } from 'typeorm';
import { ENTITIES } from '../../config/typeorm.config';
import { Allergy, DataSource as DataSourceEnum, Ingredient, MenuIngredient, StandardMenu } from '../../entities';
import { MenuMatchingService } from './menu-matching.service';

/**
 * 통합 테스트 - 실제 Postgres(docker-compose로 뜬 개발 DB)에 연결해서
 * menu_ingredient의 findOne→insert 경쟁 상태가 DB-level upsert(orIgnore)로 실제로 해결됐는지 검증한다.
 * 인메모리 mock으로는 실제 Postgres의 ON CONFLICT 동작 자체를 검증할 수 없어 통합 테스트로 작성했다.
 */
describe('MenuMatchingService - menu_ingredient 동시성 (통합 테스트)', () => {
  let dataSource: DataSource;
  let menuRepo: Repository<StandardMenu>;
  let ingredientRepo: Repository<Ingredient>;
  let linkRepo: Repository<MenuIngredient>;
  let service: MenuMatchingService;
  let testMenu: StandardMenu;
  let testIngredient: Ingredient;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'kfood_lens',
      entities: ENTITIES,
    });
    await dataSource.initialize();

    menuRepo = dataSource.getRepository(StandardMenu);
    ingredientRepo = dataSource.getRepository(Ingredient);
    linkRepo = dataSource.getRepository(MenuIngredient);

    testMenu = await menuRepo.save(
      menuRepo.create({ name: '__concurrency_test_menu__', dataSource: DataSourceEnum.AI_GENERATED }),
    );
    testIngredient = await ingredientRepo.save(
      ingredientRepo.create({ name: '__concurrency_test_ingredient__', dataSource: DataSourceEnum.AI_GENERATED }),
    );

    // 이 테스트는 menu_ingredient 링크 확정 로직(linkIngredientToMenu)만 검증하므로,
    // AI 관련 의존성(visionAiService/ingredientResolverService)과 allergyRepository는 사용하지 않아 더미로 넘긴다.
    service = new MenuMatchingService(menuRepo, linkRepo, dataSource.getRepository(Allergy), undefined as never, undefined as never);
  });

  afterAll(async () => {
    await linkRepo.delete({ menuId: testMenu.menuId, ingredientId: testIngredient.ingredientId });
    await ingredientRepo.delete({ ingredientId: testIngredient.ingredientId });
    await menuRepo.delete({ menuId: testMenu.menuId });
    await dataSource.destroy();
  });

  it('동일한 menu_id+ingredient_id에 대해 동시에 여러 요청이 들어와도 예외 없이 row가 하나만 남는다', async () => {
    const CONCURRENT_REQUESTS = 10;

    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENT_REQUESTS }, () =>
        // linkIngredientToMenu는 private이라 브래킷 표기로 접근한다 (테스트에서 흔히 쓰는 방식).
        (service as unknown as { linkIngredientToMenu: (menuId: number, ingredientId: number) => Promise<MenuIngredient> })
          .linkIngredientToMenu(testMenu.menuId, testIngredient.ingredientId),
      ),
    );

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toHaveLength(0);

    const rows = await linkRepo.find({ where: { menuId: testMenu.menuId, ingredientId: testIngredient.ingredientId } });
    expect(rows).toHaveLength(1);
  });
});
