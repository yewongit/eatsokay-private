import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AllergiesService } from './allergies.service';
import { AllergyListSuccessResponseDto } from './dto/allergy-response.dto';

/**
 * Controller 계층.
 * 알레르기 마스터 목록 조회 API(GET /api/v1/allergies)를 노출한다.
 */
@ApiTags('allergies')
@Controller('api/v1/allergies')
export class AllergiesController {
  constructor(private readonly allergiesService: AllergiesService) {}

  @Get()
  @ApiOperation({ summary: '식약처 22종 알레르기 표준 마스터 목록 조회' })
  @ApiResponse({ status: 200, description: '조회 성공', type: AllergyListSuccessResponseDto })
  async findAll() {
    const allergies = await this.allergiesService.findAll();
    return { success: true, data: allergies };
  }
}
