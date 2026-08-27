import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IngredientAllergy } from './ingredient-allergy.entity';

/**
 * Entity 계층 - 알레르기 마스터 테이블(allergy).
 * 식약처 지정 22종 알레르기 표준 코드와 한글/영문명을 저장한다.
 */
@Entity({ name: 'allergy' })
export class Allergy {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'allergy_id' })
  allergyId: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 50, name: 'name_ko' })
  nameKo: string;

  @Column({ type: 'varchar', length: 50, name: 'name_en' })
  nameEn: string;

  // 알레르기는 재료를 거쳐서만 도출된다 (메뉴에 알레르기를 직접 매핑하는 경로는 없음)
  @OneToMany(() => IngredientAllergy, (ingredientAllergy) => ingredientAllergy.allergy)
  ingredientAllergies: IngredientAllergy[];
}
