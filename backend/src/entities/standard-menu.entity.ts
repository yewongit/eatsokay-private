import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DataSource } from './data-source.enum';
import { MenuIngredient } from './menu-ingredient.entity';

/**
 * Entity 계층 - 표준 메뉴 테이블(menu).
 * Vision AI가 이미지에서 인식한 메뉴명을 매칭시키는 기준이 되는 메뉴 마스터 데이터.
 * dataSource로 이 메뉴 정보가 공식 데이터인지, AI가 추정해 생성한 것인지 구분한다.
 * 알레르기는 이 엔티티에 직접 저장되지 않고 menuIngredients -> ingredient -> ingredientAllergies 경로로만 도출된다.
 */
@Entity({ name: 'menu' })
export class StandardMenu {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'menu_id' })
  menuId: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 20, name: 'data_source', default: DataSource.OFFICIAL })
  dataSource: DataSource;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => MenuIngredient, (menuIngredient) => menuIngredient.menu)
  menuIngredients: MenuIngredient[];
}
