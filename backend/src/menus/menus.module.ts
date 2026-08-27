import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Allergy, Ingredient, IngredientAllergy, MenuAnalysisResult, MenuIngredient, StandardMenu } from '../entities';
import { AllergyFilterService } from './allergy-filter/allergy-filter.service';
import { IngredientResolverService } from './ingredient-resolver/ingredient-resolver.service';
import { MenuMatchingService } from './menu-matching/menu-matching.service';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';
import { VisionAiService } from './vision-ai/vision-ai.service';

/**
 * 메뉴 도메인 모듈.
 * StandardMenu/Allergy/Ingredient/IngredientAllergy/MenuIngredient 레포지토리와 MenusController,
 * 그리고 MenusService가 의존하는 VisionAiService/MenuMatchingService/AllergyFilterService/IngredientResolverService를 묶는다.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([StandardMenu, Allergy, Ingredient, IngredientAllergy, MenuIngredient, MenuAnalysisResult]),
  ],
  controllers: [MenusController],
  providers: [MenusService, VisionAiService, MenuMatchingService, AllergyFilterService, IngredientResolverService],
})
export class MenusModule {}
