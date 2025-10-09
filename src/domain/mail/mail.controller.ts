import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MailService } from './mail.service';
import { MailLogResponseDto } from './dto/mail-log-response.dto';

@ApiTags('Mail')
@Controller()
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('mail-logs/:id')
  @ApiOperation({
    summary: '메일 로그 조회',
    description: 'ID로 메일 로그를 조회합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '메일 로그 ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: '메일 로그 조회 성공',
    type: MailLogResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '메일 로그를 찾을 수 없음',
  })
  async getMailLog(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<MailLogResponseDto> {
    const mailLog = await this.mailService.getMailLog(id);
    return MailLogResponseDto.fromEntity(mailLog);
  }

  @Get('users/:userId/mail-logs')
  @ApiOperation({
    summary: '사용자 메일 이력 조회',
    description: '사용자의 메일 발송 이력을 조회합니다.',
  })
  @ApiParam({
    name: 'userId',
    description: '사용자 ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: '메일 이력 조회 성공',
    type: [MailLogResponseDto],
  })
  async getUserMailHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ): Promise<MailLogResponseDto[]> {
    const mailLogs = await this.mailService.getUserMailHistory(userId, limit);
    return mailLogs.map((log) => MailLogResponseDto.fromEntity(log));
  }
}
