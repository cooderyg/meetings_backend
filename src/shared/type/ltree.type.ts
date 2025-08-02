import { Type, Platform } from '@mikro-orm/core';

export class LTreeType extends Type<string, string> {
  convertToDatabaseValue(value: string, platform: Platform): string {
    if (value === null || value === undefined) {
      return value;
    }
    return value.replace(/-/g, '_');
  }

  convertToJSValue(value: string, platform: Platform): string {
    return value;
  }

  getColumnType(prop: any, platform: Platform): string {
    return 'ltree';
  }
}
