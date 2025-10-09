import { Injectable } from '@nestjs/common';
import * as mjml2html from 'mjml';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MailType } from '../../domain/mail/enum/mail-type.enum';
import { ConfigService } from '@nestjs/config';

/**
 * MJML + Handlebars 기반 메일 템플릿 컴파일 서비스
 *
 * 템플릿 위치: src/infrastructure/mail/templates/*.mjml
 * 컴파일 과정:
 * 1. MJML 파일 로드
 * 2. Handlebars로 변수 치환
 * 3. MJML → HTML 변환
 */
@Injectable()
export class MailTemplateService {
  private readonly templatesPath: string;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.templatesPath = join(__dirname, 'templates');
    this.appUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:3000'
    );
  }

  /**
   * 템플릿 타입에 따라 HTML 컴파일
   * @param type 메일 타입 (WELCOME | INVITATION)
   * @param data 템플릿 변수 데이터
   * @returns 컴파일된 HTML 문자열
   */
  compileTemplate(type: MailType, data: Record<string, any>): string {
    const templateName = this.getTemplateName(type);
    const mjmlContent = this.loadTemplate(templateName);

    // Handlebars 헬퍼 등록
    this.registerHelpers();

    // Handlebars로 변수 치환
    const template = Handlebars.compile(mjmlContent);
    const mjmlWithData = template({
      ...data,
      appUrl: this.appUrl,
    });

    // MJML → HTML 변환
    const { html, errors } = mjml2html(mjmlWithData, {
      validationLevel: 'soft',
    });

    if (errors.length > 0) {
      console.warn('[MailTemplateService] MJML compilation warnings:', errors);
    }

    return html;
  }

  /**
   * 메일 타입에 따른 템플릿 파일명 반환
   */
  private getTemplateName(type: MailType): string {
    switch (type) {
      case MailType.WELCOME:
        return 'welcome';
      case MailType.INVITATION:
        return 'invitation';
      default:
        throw new Error(`Unsupported mail type: ${type}`);
    }
  }

  /**
   * MJML 템플릿 파일 로드
   */
  private loadTemplate(name: string): string {
    const filePath = join(this.templatesPath, `${name}.mjml`);
    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to load template: ${name} (${filePath})`);
    }
  }

  /**
   * Handlebars 커스텀 헬퍼 등록
   */
  private registerHelpers(): void {
    // 날짜 포맷팅 헬퍼
    Handlebars.registerHelper('formatDate', (date: Date) => {
      if (!date) return '';
      const d = new Date(date);
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    });

    // 조건부 렌더링 헬퍼 (이미 built-in이지만 명시)
    Handlebars.registerHelper('if', function (conditional, options) {
      if (conditional) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    });
  }
}
