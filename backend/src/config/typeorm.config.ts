import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Allergy, Ingredient, IngredientAllergy, MenuAnalysisResult, MenuIngredient, StandardMenu } from '../entities';

// TypeORM에 등록할 전체 엔티티 목록. 앱 모듈뿐 아니라 seed 스크립트(run-seed, import-recipes)에서도 공용으로 사용한다.
export const ENTITIES = [Allergy, StandardMenu, Ingredient, MenuIngredient, IngredientAllergy, MenuAnalysisResult];

/**
 * TypeORM 연결 설정 팩토리.
 * 환경변수(ConfigService)로부터 DB 접속 정보를 읽어 TypeOrmModuleOptions를 생성한다.
 * 운영 환경이 아니면 synchronize(엔티티 기준 자동 스키마 동기화)를 켜서 별도 마이그레이션 없이 개발할 수 있게 한다.
 */
export function buildTypeOrmConfig(configService: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_DATABASE', 'kfood_lens'),
    entities: ENTITIES,
    synchronize: configService.get<string>('NODE_ENV', 'development') !== 'production',
    // RDS는 기본적으로 SSL 연결을 강제하므로, RDS를 쓸 때만(DB_SSL=true) 켠다. 로컬 docker-compose의 Postgres는 SSL이 없어 꺼둔 채로 둔다.
    ssl: configService.get<string>('DB_SSL', 'false') === 'true' ? { rejectUnauthorized: false } : false,
  };
}
