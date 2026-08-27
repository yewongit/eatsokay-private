import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Allergy } from '../entities';
import { ENTITIES } from '../config/typeorm.config';
import { ALLERGY_SEED_DATA } from './allergy-seed-data';

dotenv.config();

/**
 * 시드 스크립트 - 알레르기 마스터 데이터 적재.
 * ALLERGY_SEED_DATA를 DB에 upsert(코드 기준 중복 방지)한다.
 * 앱 서버 실행과 무관한 별도 CLI 스크립트로, `npm run seed`(ts-node)로 직접 실행한다.
 */
async function runSeed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'kfood_lens',
    entities: ENTITIES,
    synchronize: true,
  });

  await dataSource.initialize();
  const allergyRepository = dataSource.getRepository(Allergy);

  // code 기준으로 이미 존재하면 건너뛰어 여러 번 실행해도 중복 생성되지 않도록 함
  for (const seed of ALLERGY_SEED_DATA) {
    const existing = await allergyRepository.findOne({ where: { code: seed.code } });
    if (!existing) {
      await allergyRepository.save(allergyRepository.create(seed));
      console.log(`[seed] created allergy: ${seed.code}`);
    }
  }

  await dataSource.destroy();
  console.log('[seed] allergy master seed complete');
}

runSeed().catch((error) => {
  console.error('[seed] failed', error);
  process.exit(1);
});
