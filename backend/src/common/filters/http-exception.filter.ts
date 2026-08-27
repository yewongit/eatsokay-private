import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

/**
 * 전역 예외 필터(Global Exception Filter).
 * 모든 HttpException을 { success: false, error: {...} } 형태로 통일해 응답한다. main.ts에서 전역 등록.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    // MenuAnalysisException처럼 code/message/reason을 담은 커스텀 예외인지 판별
    const isStructured = typeof body === 'object' && body !== null && 'code' in body;

    const error = isStructured
      ? {
          code: (body as Record<string, unknown>).code,
          message: (body as Record<string, unknown>).message,
          reason: (body as Record<string, unknown>).reason,
        }
      : {
          code: HttpStatus[status] ?? 'UNKNOWN_ERROR',
          message: typeof body === 'string' ? body : (body as Record<string, unknown>)?.message ?? exception.message,
          reason: undefined,
        };

    response.status(status).json({
      success: false,
      error,
    });
  }
}
