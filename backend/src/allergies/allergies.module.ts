import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Allergy } from '../entities';
import { AllergiesController } from './allergies.controller';
import { AllergiesService } from './allergies.service';

/**
 * 알레르기 도메인 모듈.
 * Allergy 레포지토리, Controller, Service를 하나로 묶는다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Allergy])],
  controllers: [AllergiesController],
  providers: [AllergiesService],
})
export class AllergiesModule {}
