import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * 애플리케이션 진입점(Entry Point).
 * Nest 앱을 생성하고 CORS, 전역 유효성 검증 파이프, 전역 예외 필터, Swagger 문서를 설정한 뒤 서버를 기동한다.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 프론트엔드 개발 서버(기본 3001 포트)의 요청만 허용
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3001'),
  });

  // DTO에 정의되지 않은 속성은 제거(whitelist)하고, 요청값을 DTO 타입으로 변환(transform)
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  // 모든 예외를 { success: false, error: {...} } 형태로 통일해 응답
  app.useGlobalFilters(new HttpExceptionFilter());

  // http://localhost:{port}/api-docs 에서 확인 가능한 Swagger API 명세 생성
  const swaggerConfig = new DocumentBuilder()
    .setTitle('K-Food Lens API')
    .setDescription('메뉴판 이미지 기반 알레르기 위험도 판별 서비스 API 명세')
    .setVersion('1.0')
    .addTag('menus', '메뉴판 분석')
    .addTag('allergies', '알레르기 마스터')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`K-Food Lens backend listening on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
}

bootstrap();
