import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MenuAnalysisException } from '../common/exceptions/menu-analysis.exception';
import { ApiErrorResponseDto } from '../common/dto/api-error.dto';
import { AnalyzeMenuRequestDto } from './dto/analyze-menu-request.dto';
import { AnalyzeMenuSuccessResponseDto } from './dto/analyze-menu-response.dto';
import { MenuAnalysisDetailSuccessResponseDto } from './dto/menu-analysis-detail-response.dto';
import { MenusService } from './menus.service';

/**
 * Controller 계층.
 * 메뉴판 이미지 분석 API(POST /api/v1/menus/analyze)와 상세 결과 조회 API(GET /api/v1/menus/analyze/:sessionId/:menuId)를 노출한다.
 * multipart 이미지 파일과 알레르기 정보를 받아 MenusService에 위임하고, 결과를 { success, data } 형태로 감싼다.
 */
@ApiTags('menus')
@Controller('api/v1/menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Post('analyze')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: '메뉴판 이미지 분석 및 알레르기 위험도 판별',
    description:
      '메뉴판 이미지를 Vision AI로 분석해 메뉴명을 추출하고, 등록된 알레르기와 교차 검증하여 DANGER/NEEDS_CHECK 상태를 반환합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary', description: '메뉴판 이미지 파일' },
        allergyIds: {
          type: 'string',
          example: '1,5,10',
          description: '사용자가 선택한 알레르기 ID 목록 (쉼표로 구분)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: '분석 성공', type: AnalyzeMenuSuccessResponseDto })
  @ApiResponse({
    status: 400,
    description: '메뉴판이 아니거나 이미지가 없는 경우',
    type: ApiErrorResponseDto,
  })
  async analyze(
    @UploadedFile() image: Express.Multer.File,
    @Body() requestDto: AnalyzeMenuRequestDto,
  ) {
    // 이미지 파일이 없으면 서비스 계층을 호출하지 않고 즉시 400 에러 반환
    if (!image) {
      throw new MenuAnalysisException(
        'INVALID_IMAGE_OR_NOT_MENU',
        '메뉴판 이미지가 업로드되지 않았습니다.',
        'NO_IMAGE_PROVIDED',
      );
    }

    const data = await this.menusService.analyzeMenu(image.buffer, image.mimetype, requestDto);

    return { success: true, data };
  }

  @Get('analyze/:sessionId/:menuId')
  @ApiOperation({
    summary: '메뉴 상세 분석 결과 조회',
    description:
      '세션ID와 메뉴ID로, POST /analyze 때 저장된 메뉴 1건의 상세 분석 결과(충돌 알레르기, 재료 근거, 안내 문구 등)를 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: MenuAnalysisDetailSuccessResponseDto })
  @ApiResponse({
    status: 404,
    description: '세션ID/메뉴ID에 해당하는 분석 결과가 없는 경우',
    type: ApiErrorResponseDto,
  })
  async getAnalysisDetail(
    @Param('sessionId') sessionId: string,
    @Param('menuId', ParseIntPipe) menuId: number,
  ) {
    const data = await this.menusService.getAnalysisDetail(sessionId, menuId);

    return { success: true, data };
  }
}
