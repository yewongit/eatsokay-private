import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Allergy } from './allergy.entity';
import { DataSource } from './data-source.enum';
import { Ingredient } from './ingredient.entity';

/**
 * Entity 계층 - 재료-알레르기 결정론적 매핑 사전 테이블(ingredient_allergy).
 * 재료 하나당 시스템 전체에서 단 한 번만 AI에게 물어보고, 그 결과를 이 테이블에 영구 캐싱해서 재사용한다.
 * 메뉴의 알레르기는 항상 menu_ingredient -> ingredient_allergy -> allergy 경로로만 도출되며,
 * 메뉴에 알레르기를 직접 매핑하는 경로는 존재하지 않는다(환각 위험을 이 테이블 하나로만 흡수).
 */
@Entity({ name: 'ingredient_allergy' })
export class IngredientAllergy {
  @PrimaryColumn({ type: 'bigint', name: 'ingredient_id' })
  ingredientId: number;

  @PrimaryColumn({ type: 'bigint', name: 'allergy_id' })
  allergyId: number;

  @Column({ type: 'varchar', length: 20, name: 'data_source', default: DataSource.OFFICIAL })
  dataSource: DataSource;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Ingredient, (ingredient) => ingredient.ingredientAllergies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient;

  @ManyToOne(() => Allergy, (allergy) => allergy.ingredientAllergies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'allergy_id' })
  allergy: Allergy;
}
