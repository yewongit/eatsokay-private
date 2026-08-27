import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DataSource } from './data-source.enum';
import { Ingredient } from './ingredient.entity';
import { StandardMenu } from './standard-menu.entity';

/**
 * Entity 계층 - 메뉴-재료 매핑 테이블(menu_ingredient).
 * StandardMenu와 Ingredient의 다대다 관계를 표현하는 조인 엔티티.
 * dataSource로 이 메뉴-재료 관계가 공식 레시피 기반인지, AI가 해당 메뉴에 대해 추정한 구성인지 구분한다.
 */
@Entity({ name: 'menu_ingredient' })
export class MenuIngredient {
  @PrimaryColumn({ type: 'bigint', name: 'menu_id' })
  menuId: number;

  @PrimaryColumn({ type: 'bigint', name: 'ingredient_id' })
  ingredientId: number;

  @Column({ type: 'varchar', length: 20, name: 'data_source', default: DataSource.OFFICIAL })
  dataSource: DataSource;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => StandardMenu, (menu) => menu.menuIngredients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: StandardMenu;

  @ManyToOne(() => Ingredient, (ingredient) => ingredient.menuIngredients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient;
}
