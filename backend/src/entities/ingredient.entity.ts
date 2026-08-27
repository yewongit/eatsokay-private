import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DataSource } from './data-source.enum';
import { IngredientAllergy } from './ingredient-allergy.entity';
import { MenuIngredient } from './menu-ingredient.entity';

/**
 * Entity 계층 - 재료 마스터 테이블(ingredient).
 * 메뉴가 사용하는 재료명을 저장하며, 커스텀 알레르기 키워드 매칭과 알레르기 판별(ingredient_allergy 경유)의 기준이 된다.
 * dataSource로 공식 데이터인지 AI가 신규로 추론해 생성한 재료인지 구분한다.
 */
@Entity({ name: 'ingredient' })
export class Ingredient {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'ingredient_id' })
  ingredientId: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 20, name: 'data_source', default: DataSource.OFFICIAL })
  dataSource: DataSource;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => MenuIngredient, (menuIngredient) => menuIngredient.ingredient)
  menuIngredients: MenuIngredient[];

  @OneToMany(() => IngredientAllergy, (ingredientAllergy) => ingredientAllergy.ingredient)
  ingredientAllergies: IngredientAllergy[];
}
