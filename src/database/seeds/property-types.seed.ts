import { Logger } from '@nestjs/common';
import { BUILT_IN_PROPERTY_TYPES } from '../../modules/property-types/property-types.constants.js';
import { PropertyTypesService } from '../../modules/property-types/property-types.service.js';

const logger = new Logger('PropertyTypesSeed');

// Idempotent: existing built-in types are left as they are
export const seedPropertyTypes = async (
  propertyTypesService: PropertyTypesService,
): Promise<void> => {
  const created = await propertyTypesService.seedBuiltInTypes(
    BUILT_IN_PROPERTY_TYPES,
  );

  logger.log(
    `Built-in property types: ${created} created, ${BUILT_IN_PROPERTY_TYPES.length - created} already present`,
  );
};
