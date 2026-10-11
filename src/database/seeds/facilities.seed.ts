import { Logger } from '@nestjs/common';
import { BUILT_IN_FACILITIES } from '../../modules/facilities/facilities.constants.js';
import { FacilitiesService } from '../../modules/facilities/facilities.service.js';

const logger = new Logger('FacilitiesSeed');

// Idempotent: existing built-in facilities are left as they are
export const seedFacilities = async (
  facilitiesService: FacilitiesService,
): Promise<void> => {
  const created = await facilitiesService.seedBuiltInFacilities(
    BUILT_IN_FACILITIES,
  );

  logger.log(
    `Built-in facilities: ${created} created, ${BUILT_IN_FACILITIES.length - created} already present`,
  );
};
