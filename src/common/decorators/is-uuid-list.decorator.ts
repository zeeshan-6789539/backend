import { applyDecorators } from '@nestjs/common';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

// A unique list of ids with every validation step explaining itself
export const IsUuidList = (field: string, maxSize: number): PropertyDecorator =>
  applyDecorators(
    IsArray({ message: `${field} must be a list of ids` }),
    ArrayMaxSize(maxSize, { message: `${field} can hold at most ${maxSize} ids` }),
    ArrayUnique({ message: `${field} must not repeat an id` }),
    IsUUID(undefined, { each: true, message: `Each id in ${field} must be a valid UUID` }),
  );
