import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Allergy } from '../entities';

/**
 * Service 계층.
 * Allergy 레포지토리를 통해 알레르기 마스터 데이터를 조회하는 비즈니스 로직을 담당한다.
 */
@Injectable()
export class AllergiesService {
  constructor(
    @InjectRepository(Allergy)
    private readonly allergyRepository: Repository<Allergy>,
  ) {}

  // allergyId 오름차순으로 전체 목록 반환 (프론트엔드 체크박스 목록 표시용)
  async findAll(): Promise<Allergy[]> {
    return this.allergyRepository.find({ order: { allergyId: 'ASC' } });
  }
}
