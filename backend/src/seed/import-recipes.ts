import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import {
  Allergy,
  DataSource as MenuDataSource,
  Ingredient,
  IngredientAllergy,
  MenuIngredient,
  StandardMenu,
} from '../entities';
import { ENTITIES } from '../config/typeorm.config';
import { INGREDIENT_ALLERGY_MAP } from './ingredient-allergy-map';

const PROJECT_ROOT = path.resolve(__dirname, '../../../');
const BASE_CSV_PATH = path.join(PROJECT_ROOT, '레시피_기본정보_50선.csv');
const INGREDIENT_CSV_PATH = path.join(PROJECT_ROOT, '레시피_재료정보_50선.csv');

interface BaseRow {
  recipeId: string;
  name: string;
}

interface IngredientRow {
  recipeId: string;
  ingredientName: string;
}

// 쉼표/개행이 포함된 필드(쌍따옴표로 감싸진 값)까지 처리하는 최소한의 CSV 파서
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // skip
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// '레시피_기본정보_50선.csv'에서 레시피ID-메뉴명 매핑을 읽어온다 (BOM 제거 후 헤더 컬럼명으로 인덱스 탐색)
function readBaseRows(): BaseRow[] {
  const text = fs.readFileSync(BASE_CSV_PATH, 'utf-8').replace(/^﻿/, '');
  const rows = parseCsv(text);
  const [header, ...body] = rows;
  const recipeIdIdx = header.indexOf('RECIPE_ID');
  const nameIdx = header.indexOf('RECIPE_NM_KO');
  return body
    .filter((r) => r.length > 1 && r[recipeIdIdx]?.trim())
    .map((r) => ({ recipeId: r[recipeIdIdx].trim(), name: r[nameIdx].trim() }));
}

// '레시피_재료정보_50선.csv'에서 레시피ID-재료명 매핑을 읽어온다
function readIngredientRows(): IngredientRow[] {
  const text = fs.readFileSync(INGREDIENT_CSV_PATH, 'utf-8').replace(/^﻿/, '');
  const rows = parseCsv(text);
  const [header, ...body] = rows;
  const recipeIdIdx = header.indexOf('RECIPE_ID');
  const nameIdx = header.indexOf('IRDNT_NM');
  return body
    .filter((r) => r.length > 1 && r[recipeIdIdx]?.trim())
    .map((r) => ({ recipeId: r[recipeIdIdx].trim(), ingredientName: r[nameIdx].trim() }));
}

/**
 * 시드 스크립트 - 레시피 CSV 임포트.
 * 프로젝트 루트의 '레시피_기본정보_50선.csv', '레시피_재료정보_50선.csv'를 파싱하여
 * StandardMenu/Ingredient/MenuIngredient 테이블을 채우고, 정적 사전(INGREDIENT_ALLERGY_MAP)에 있는 재료는
 * ingredient_allergy 테이블에 OFFICIAL/검증됨 상태로 직접 반영한다 (런타임에 AI를 태우지 않음).
 * 앱 서버 실행과 무관한 별도 CLI 스크립트로, ts-node로 직접 실행한다.
 */
async function importRecipes() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'kfood_lens',
    entities: ENTITIES,
    synchronize: true,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await dataSource.initialize();

  const menuRepo = dataSource.getRepository(StandardMenu);
  const ingredientRepo = dataSource.getRepository(Ingredient);
  const menuIngredientRepo = dataSource.getRepository(MenuIngredient);
  const ingredientAllergyRepo = dataSource.getRepository(IngredientAllergy);
  const allergyRepo = dataSource.getRepository(Allergy);

  const allergies = await allergyRepo.find();
  const allergyByCode = new Map(allergies.map((a) => [a.code, a]));

  const baseRows = readBaseRows();
  const ingredientRows = readIngredientRows();

  const recipeIdToMenuId = new Map<string, number>();
  let createdMenuCount = 0;

  // 메뉴명이 이미 존재하면 재사용, 없으면 OFFICIAL/검증됨 상태로 신규 생성
  for (const row of baseRows) {
    let menu = await menuRepo.findOne({ where: { name: row.name } });
    if (!menu) {
      menu = await menuRepo.save(
        menuRepo.create({
          name: row.name,
          dataSource: MenuDataSource.OFFICIAL,
        }),
      );
      createdMenuCount += 1;
    }
    recipeIdToMenuId.set(row.recipeId, menu.menuId);
  }
  console.log(`[import] menu: ${createdMenuCount}건 생성 (총 ${baseRows.length}건 매핑)`);

  const ingredientNameToId = new Map<string, number>();
  const existingIngredients = await ingredientRepo.find();
  existingIngredients.forEach((i) => ingredientNameToId.set(i.name, i.ingredientId));

  const menuIngredientNames = new Map<number, Set<string>>();

  let createdIngredientCount = 0;
  let createdLinkCount = 0;
  let createdIngredientAllergyCount = 0;

  // 재료 마스터를 채우고, 메뉴-재료 매핑(menu_ingredient)을 생성 (메뉴당 재료명 중복은 Set으로 방지)
  for (const row of ingredientRows) {
    const menuId = recipeIdToMenuId.get(row.recipeId);
    if (!menuId || !row.ingredientName) continue;

    let ingredientId = ingredientNameToId.get(row.ingredientName);
    if (!ingredientId) {
      const ingredient = await ingredientRepo.save(
        ingredientRepo.create({ name: row.ingredientName, dataSource: MenuDataSource.OFFICIAL }),
      );
      ingredientId = ingredient.ingredientId;
      ingredientNameToId.set(row.ingredientName, ingredientId);
      createdIngredientCount += 1;

      // 이 재료가 시스템에 처음 등장하는 시점에, 정적 사전(INGREDIENT_ALLERGY_MAP)에 있으면 ingredient_allergy에 바로 반영
      // (런타임에 AI를 태우지 않고, 공식 데이터 임포트 시점에 결정론적으로 캐싱)
      const codes = INGREDIENT_ALLERGY_MAP[row.ingredientName];
      if (codes) {
        for (const code of codes) {
          const allergy = allergyByCode.get(code);
          if (!allergy) continue;
          await ingredientAllergyRepo.save(
            ingredientAllergyRepo.create({
              ingredientId,
              allergyId: allergy.allergyId,
              dataSource: MenuDataSource.OFFICIAL,
            }),
          );
          createdIngredientAllergyCount += 1;
        }
      }
    }

    if (!menuIngredientNames.has(menuId)) menuIngredientNames.set(menuId, new Set());
    const namesForMenu = menuIngredientNames.get(menuId)!;
    if (namesForMenu.has(row.ingredientName)) continue;
    namesForMenu.add(row.ingredientName);

    const existingLink = await menuIngredientRepo.findOne({ where: { menuId, ingredientId } });
    if (!existingLink) {
      await menuIngredientRepo.save(
        menuIngredientRepo.create({ menuId, ingredientId, dataSource: MenuDataSource.OFFICIAL }),
      );
      createdLinkCount += 1;
    }
  }
  console.log(`[import] ingredient: ${createdIngredientCount}건 신규 생성`);
  console.log(`[import] ingredient_allergy: ${createdIngredientAllergyCount}건 매핑 생성 (정적 사전 기반)`);
  console.log(`[import] menu_ingredient: ${createdLinkCount}건 매핑 생성`);

  await dataSource.destroy();
  console.log('[import] 레시피 50선 임포트 완료');
}

importRecipes().catch((error) => {
  console.error('[import] failed', error);
  process.exit(1);
});
