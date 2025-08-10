import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { AppConfig } from '../../shared/module/app-config/app-config';
import { LoggerService } from '../../shared/module/logger/logger.service';
import { AppException } from '../../shared/exception/app.exception';
import { ERROR_CODES } from '../../shared/const/error-code.const';
import {
  ILangchainService,
  GenerateOptions,
} from './interfaces/langchain.interface';
import {
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from './const/langchain.const';

@Injectable()
export class LangchainService implements ILangchainService, OnModuleInit {
  private defaultModel: ChatOpenAI;

  constructor(
    private readonly appConfig: AppConfig,
    private readonly logger: LoggerService
  ) {
    const apiKey = this.appConfig.langchain.openaiApiKey;
    if (!apiKey) {
      throw new AppException(ERROR_CODES.SYSTEM_INTERNAL_ERROR, {
        message: 'OpenAI API key is not configured',
      });
    }

    this.defaultModel = new ChatOpenAI({
      apiKey,
      model: DEFAULT_MODEL,
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
    });
  }

  onModuleInit() {
    this.initializeLangSmithTracing();
  }

  /**
   * LangSmith 추적을 초기화합니다.
   * 환경변수 직접 설정 대신 LangChain의 공식 설정 방식을 사용합니다.
   */
  private initializeLangSmithTracing(): void {
    const {
      langsmithTracing,
      langsmithEndpoint,
      langsmithApiKey,
      langsmithProject,
    } = this.appConfig.langchain;

    if (langsmithTracing && langsmithApiKey) {
      // LangChain 공식 설정 방식 사용
      const langsmithConfig = {
        LANGSMITH_TRACING: 'true',
        LANGSMITH_ENDPOINT: langsmithEndpoint,
        LANGSMITH_API_KEY: langsmithApiKey,
        LANGSMITH_PROJECT: langsmithProject,
      };

      // 환경변수 설정 (런타임에만 적용)
      Object.entries(langsmithConfig).forEach(([key, value]) => {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });

      this.logger.info(
        `LangSmith tracing enabled for project: ${langsmithProject}`,
        'LangchainService'
      );
    } else {
      this.logger.info('LangSmith tracing disabled', 'LangchainService');
    }
  }

  async generateText(
    prompt: string,
    options?: GenerateOptions
  ): Promise<string> {
    try {
      const model = this.getModelInstance(options);
      const messages = this.buildMessages(prompt, options?.systemPrompt);

      const response = await model.invoke(messages);
      return response.content as string;
    } catch (error) {
      this.logger.error(
        `LangChain text generation failed: ${error.message}`,
        error,
        'LangchainService'
      );
      throw new AppException(ERROR_CODES.EXTERNAL_API_ERROR, {
        message: `Failed to generate text: ${error.message}`,
        details: { error: error.message },
      });
    }
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: any,
    options?: GenerateOptions
  ): Promise<T> {
    try {
      const model = this.getModelInstance(options);
      const structuredModel = model.withStructuredOutput(schema);
      const messages = this.buildMessages(prompt, options?.systemPrompt);

      const response = await structuredModel.invoke(messages);
      return response as T;
    } catch (error) {
      this.logger.error(
        `LangChain structured output generation failed: ${error.message}`,
        error,
        'LangchainService'
      );
      throw new AppException(ERROR_CODES.EXTERNAL_API_ERROR, {
        message: `Failed to generate structured output: ${error.message}`,
        details: { error: error.message },
      });
    }
  }

  /**
   * 옵션에 따라 적절한 모델 인스턴스를 반환합니다.
   * 기본 설정과 다른 옵션이 있을 경우에만 새 인스턴스를 생성합니다.
   */
  private getModelInstance(options?: GenerateOptions): ChatOpenAI {
    if (!options || this.isDefaultOptions(options)) {
      return this.defaultModel;
    }

    return new ChatOpenAI({
      apiKey: this.appConfig.langchain.openaiApiKey,
      model: options.model || DEFAULT_MODEL,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      maxTokens: options.maxTokens || DEFAULT_MAX_TOKENS,
    });
  }

  /**
   * 주어진 옵션이 기본값과 동일한지 확인합니다.
   */
  private isDefaultOptions(options: GenerateOptions): boolean {
    return (
      (!options.model || options.model === DEFAULT_MODEL) &&
      (options.temperature === undefined ||
        options.temperature === DEFAULT_TEMPERATURE) &&
      (!options.maxTokens || options.maxTokens === DEFAULT_MAX_TOKENS)
    );
  }

  /**
   * 프롬프트와 시스템 프롬프트로부터 메시지 배열을 구성합니다.
   */
  private buildMessages(
    prompt: string,
    systemPrompt?: string
  ): [string, string][] {
    const messages: [string, string][] = [];

    if (systemPrompt) {
      messages.push(['system', systemPrompt]);
    }
    messages.push(['human', prompt]);

    return messages;
  }
}
