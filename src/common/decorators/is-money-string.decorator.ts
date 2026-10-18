import {
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';

// At most 12 whole digits: the largest value a numeric(14,2) column can hold
const MONEY_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

// A non-negative monetary amount as a string, up to 2 decimal places — matches
// the numeric(14,2) columns this feeds (leases, charges, payments amounts)
export function IsMoneyString(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isMoneyString',
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && MONEY_PATTERN.test(value);
        },
        defaultMessage(): string {
          return `${propertyName.toString()} must be a monetary amount of at most 12 digits with up to 2 decimal places`;
        },
      },
    });
  };
}
