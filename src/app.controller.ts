import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  Inject,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import {
  ISttService,
  STT_SERVICE,
  TranscriptionConfig,
} from './infrastructure/stt';
import { ILangchainService } from './infrastructure/langchain/interfaces/langchain.interface';
import { LANGCHAIN_SERVICE } from './infrastructure/langchain/const/langchain.const';

// Swagger Response DTOs
class FileInfoDto {
  name: string;
  size: number;
  type: string;
}

class WordDetailDto {
  word: string;
  confidence: number;
  startTime: number;
  endTime: number;
  speakerId?: string | number;
}

class TranscriptionResultDto {
  transcript: string;
  confidence: number;
  languageCode: string;
  wordCount: number;
  hasWords: boolean;
  words?: WordDetailDto[];
  wordPreview?: WordDetailDto[];
  isChunked?: boolean;
  chunkCount?: number;
  processingTimeMs?: number;
}

class SttTestSuccessResponseDto {
  success: true;
  file: FileInfoDto;
  transcription: TranscriptionResultDto;
}

class SttTestErrorResponseDto {
  success: false;
  error: string;
  file: FileInfoDto;
}

class LangchainTestRequestDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}

class LangchainTestResponseDto {
  success: boolean;
  response?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    model: string;
    temperature: number;
    timestamp: string;
  };
}

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    @Inject(LANGCHAIN_SERVICE)
    private readonly langchainService: ILangchainService
  ) {}

  @Get('health')
  @ApiOperation({ summary: '서버 상태 확인' })
  health() {
    return { status: 'ok' };
  }

  // @Post('test-stt')
  // @ApiOperation({
  //   summary: 'STT 서비스 테스트',
  //   description: '오디오 파일을 업로드하여 음성을 텍스트로 변환합니다.',
  // })
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({
  //   description: '변환할 오디오 파일',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       audio: {
  //         type: 'string',
  //         format: 'binary',
  //         description: '오디오 파일 (WAV, MP3, FLAC 등 지원, 최대 10MB)',
  //       },
  //     },
  //     required: ['audio'],
  //   },
  // })
  // @ApiOkResponse({
  //   description: 'STT 변환 성공',
  //   type: SttTestSuccessResponseDto,
  //   examples: {
  //     success: {
  //       summary: '성공 응답 예시',
  //       value: {
  //         success: true,
  //         file: {
  //           name: 'meeting.wav',
  //           size: 1024000,
  //           type: 'audio/wav',
  //         },
  //         transcription: {
  //           transcript: '안녕하세요. 오늘 회의를 시작하겠습니다.',
  //           confidence: 0.95,
  //           languageCode: 'ko-KR',
  //           wordCount: 8,
  //           hasWords: true,
  //           words: [
  //             {
  //               word: '안녕하세요',
  //               confidence: 0.98,
  //               startTime: 0.1,
  //               endTime: 0.8,
  //               speakerId: 1,
  //             },
  //             {
  //               word: '오늘',
  //               confidence: 0.97,
  //               startTime: 0.9,
  //               endTime: 1.2,
  //               speakerId: 1,
  //             },
  //           ],
  //           wordPreview: [
  //             {
  //               word: '안녕하세요',
  //               confidence: 0.98,
  //               startTime: 0.1,
  //               endTime: 0.8,
  //               speakerId: 1,
  //             },
  //             {
  //               word: '오늘',
  //               confidence: 0.97,
  //               startTime: 0.9,
  //               endTime: 1.2,
  //               speakerId: 1,
  //             },
  //           ],
  //         },
  //       },
  //     },
  //   },
  // })
  // @ApiBadRequestResponse({
  //   description: 'STT 변환 실패',
  //   type: SttTestErrorResponseDto,
  //   examples: {
  //     error: {
  //       summary: '실패 응답 예시',
  //       value: {
  //         success: false,
  //         error: 'GCP STT API 오류',
  //         file: {
  //           name: 'invalid.txt',
  //           size: 1024,
  //           type: 'text/plain',
  //         },
  //       },
  //     },
  //   },
  // })
  // @UseInterceptors(FileInterceptor('audio'))
  // async testStt(
  //   @UploadedFile() file: any
  // ): Promise<SttTestSuccessResponseDto | SttTestErrorResponseDto> {
  //   if (!file) {
  //     throw new BadRequestException('오디오 파일이 필요합니다');
  //   }
  //
  //   // 매우 큰 파일에 대한 경고 (50MB 이상)
  //   const warnFileSize = 50 * 1024 * 1024; // 50MB
  //   if (file.size > warnFileSize) {
  //     console.warn(
  //       `큰 파일 처리 중: ${(file.size / 1024 / 1024).toFixed(2)}MB - 처리 시간이 오래 걸릴 수 있습니다.`
  //     );
  //   }
  //
  //   console.log('업로드된 파일:', {
  //     originalname: file.originalname,
  //     mimetype: file.mimetype,
  //     size: file.size,
  //     sizeMB: (file.size / 1024 / 1024).toFixed(2) + 'MB',
  //   });
  //
  //   const startTime = Date.now();
  //   try {
  //     const config: TranscriptionConfig = {
  //       languageCode: 'ko-KR',
  //       features: {
  //         enableWordTimeOffsets: true,
  //         enableWordConfidence: true,
  //         enableAutomaticPunctuation: true,
  //         diarizationConfig: {
  //           enableSpeakerDiarization: true,
  //           minSpeakerCount: 1,
  //           maxSpeakerCount: 3,
  //         },
  //       },
  //     };
  //
  //     const result = await this.sttService.transcribeAudio(file.buffer, config);
  //
  //     const processingTimeMs = Date.now() - startTime;
  //
  //     // 9MB보다 큰 파일인지 확인 (청크 처리 여부)
  //     const maxChunkSize = 9 * 1024 * 1024;
  //     const isChunked = file.size > maxChunkSize;
  //     const chunkCount = isChunked ? Math.ceil(file.size / maxChunkSize) : 1;
  //
  //     console.log('STT 처리 완료:', {
  //       transcript: result.transcript,
  //       processingTimeMs,
  //       isChunked,
  //       chunkCount,
  //     });
  //
  //     return {
  //       success: true,
  //       file: {
  //         name: file.originalname,
  //         size: file.size,
  //         type: file.mimetype,
  //       },
  //       transcription: {
  //         transcript: result.transcript,
  //         confidence: result.confidence,
  //         languageCode: result.languageCode,
  //         wordCount: 0, // Word 정보 제거
  //         hasWords: false, // Word 정보 제거
  //         isChunked,
  //         chunkCount,
  //         processingTimeMs,
  //       },
  //     };
  //   } catch (error) {
  //     console.error('STT 오류:', error);
  //     return {
  //       success: false,
  //       error: error.message,
  //       file: {
  //         name: file.originalname,
  //         size: file.size,
  //         type: file.mimetype,
  //       },
  //     };
  //   }
  // }

  @Post('test-langchain')
  @ApiOperation({
    summary: 'LangChain 서비스 테스트',
    description: 'OpenAI GPT 모델을 통해 텍스트를 생성합니다.',
  })
  @ApiBody({
    description: '텍스트 생성 요청',
    type: LangchainTestRequestDto,
    examples: {
      simple: {
        summary: '간단한 질문',
        value: {
          prompt: '안녕하세요! 오늘 날씨가 어떤가요?',
        },
      },
      withSystem: {
        summary: '시스템 프롬프트와 함께',
        value: {
          prompt: '회의 요약을 작성해주세요.',
          systemPrompt: '당신은 전문적인 회의 요약 작성자입니다.',
          temperature: 0.3,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'LangChain 텍스트 생성 성공',
    type: LangchainTestResponseDto,
    examples: {
      success: {
        summary: '성공 응답 예시',
        value: {
          success: true,
          response:
            '안녕하세요! 저는 AI 어시스턴트입니다. 실제 날씨 정보에 접근할 수는 없지만...',
          metadata: {
            model: 'gpt-4o-mini',
            temperature: 0.7,
            timestamp: '2025-01-08T10:30:00Z',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'LangChain 텍스트 생성 실패',
    type: LangchainTestResponseDto,
    examples: {
      error: {
        summary: '실패 응답 예시',
        value: {
          success: false,
          error: {
            code: 'LANGCHAIN_ERROR',
            message: 'OpenAI API 오류: API 키가 유효하지 않습니다.',
            details: { error: 'API key is invalid' },
          },
          metadata: {
            model: 'gpt-4o-mini',
            temperature: 0.1,
            timestamp: '2025-01-08T10:30:00Z',
          },
        },
      },
    },
  })
  async testLangchain(
    @Body() body: LangchainTestRequestDto
  ): Promise<LangchainTestResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      if (!body.prompt || body.prompt.trim().length === 0) {
        throw new BadRequestException('프롬프트가 필요합니다');
      }

      const response = await this.langchainService.generateText(body.prompt, {
        systemPrompt: body.systemPrompt,
        temperature: body.temperature || 0.1,
        maxTokens: 1000,
      });

      return {
        success: true,
        response,
        metadata: {
          model: 'gpt-4o-mini',
          temperature: body.temperature || 0.1,
          timestamp,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LANGCHAIN_ERROR',
          message: error.message,
          details: { error: error.message },
        },
        metadata: {
          model: 'gpt-4o-mini',
          temperature: body.temperature || 0.1,
          timestamp,
        },
      };
    }
  }
}
