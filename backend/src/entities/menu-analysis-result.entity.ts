import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { DataSource } from './data-source.enum';

export type MenuAnalysisStatus = 'DANGER' | 'NEEDS_CHECK';

export interface MenuAnalysisConflictDetail {
  allergyLabel: string;
  ingredientNames: string[];
}

/**
 * Entity 계층 - 메뉴판 분석 결과 저장 테이블(menu_analysis_result).
 * POST /menus/analyze 호출 1건마다 인식된 메뉴 항목 수만큼 row가 생성되며, 같은 호출의 row는 sessionId로 묶인다.
 * 이후 GET /menus/analyze/:sessionId/:menuId 상세 조회는 이 테이블의 id(=menuId) + sessionId로 단건 조회한다.
 */
@Entity({ name: 'menu_analysis_result' })
export class MenuAnalysisResult {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Index()
  @Column({ type: 'varchar', length: 36, name: 'session_id' })
  sessionId: string;

  @Column({ type: 'varchar', length: 100, name: 'original_name_ko' })
  originalNameKo: string;

  @Column({ type: 'varchar', length: 100, name: 'translated_name_en' })
  translatedNameEn: string;

  @Column({ type: 'varchar', length: 20 })
  status: MenuAnalysisStatus;

  @Column({ type: 'jsonb', name: 'conflict_allergies' })
  conflictAllergies: string[];

  @Column({ type: 'jsonb', name: 'conflict_details' })
  conflictDetails: MenuAnalysisConflictDetail[];

  @Column({ type: 'varchar', length: 20, name: 'data_source' })
  dataSource: DataSource;

  @Column({ type: 'jsonb', name: 'notice_messages', nullable: true })
  noticeMessages: string[] | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
