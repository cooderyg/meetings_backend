export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ILangchainService {
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;
  generateStructuredOutput<T>(
    prompt: string,
    schema: any,
    options?: GenerateOptions
  ): Promise<T>;
}
