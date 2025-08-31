import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

/**
 * 두 필드 중 하나는 반드시 값이 있어야 하는 validator
 */
@ValidatorConstraint({ name: 'EitherOr', async: false })
export class EitherOrConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    // 둘 중 하나라도 있으면 true
    return !!(value || relatedValue);
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} 또는 ${relatedPropertyName} 중 하나는 반드시 입력해야 합니다.`;
  }
}

/**
 * 두 필드 중 하나는 반드시 값이 있어야 함을 검증하는 데코레이터
 * @param property 다른 필드명
 * @param validationOptions validation 옵션
 */
export function IsEitherOr(
  property: string,
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: EitherOrConstraint,
    });
  };
}
