import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllergiesModule } from './allergies/allergies.module';
import { buildTypeOrmConfig } from './config/typeorm.config';
import { MenusModule } from './menus/menus.module';

/**
 * 애플리케이션 루트 모듈(Root Module).
 * 환경설정(ConfigModule), DB 연결(TypeOrmModule), 메뉴/알레르기 도메인 모듈을 하나로 묶는다.
 */
@Module({
  imports: [
    // .env 파일의 환경변수를 앱 전역에서 주입받을 수 있도록 설정
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildTypeOrmConfig,
    }),
    MenusModule,
    AllergiesModule,
  ],
})
export class AppModule {}
