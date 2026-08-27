import { BadRequestException } from '@nestjs/common';

/**
 * 메뉴판 분석 관련 커스텀 예외.
 * code(에러 식별자)/message(사용자 안내 문구)/reason(내부 원인)을 담아 400 Bad Request로 응답한다.
 */
export class MenuAnalysisException extends BadRequestException {
  constructor(code: string, message: string, reason: string) {
    super({ code, message, reason });
  }
}
