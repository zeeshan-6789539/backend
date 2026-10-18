import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ne, type SQL } from 'drizzle-orm';
import { SortOrder } from '../../common/enums/sort-order.enum.js';
import { withDatabaseErrors } from '../../common/utils/database-error.util.js';
import { getOffset } from '../../common/utils/pagination.util.js';
import { buildSearchCondition } from '../../common/utils/query.util.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type {
  IContactRow,
  INewContactRow,
} from '../../database/interfaces/i-contact-row.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import { contacts } from '../../database/schema/index.js';
import { CONTACT_CONSTRAINT_MESSAGES } from './contacts.constants.js';
import type { IContactListResult } from './interfaces/i-contact-list-result.js';
import type { IFindContactsOptions } from './interfaces/i-find-contacts-options.js';

const SEARCHABLE_COLUMNS = [
  contacts.name,
  contacts.phone,
  contacts.cnic,
  contacts.email,
];

@Injectable()
export class ContactsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async findById(
    companyId: string,
    id: string,
  ): Promise<IContactRow | undefined> {
    const [row] = await this.db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.companyId, companyId)))
      .limit(1);

    return row;
  }

  async findByPhone(
    companyId: string,
    phone: string,
    excludeId?: string,
  ): Promise<IContactRow | undefined> {
    const [row] = await this.db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.companyId, companyId),
          eq(contacts.phone, phone),
          excludeId ? ne(contacts.id, excludeId) : undefined,
        ),
      )
      .limit(1);

    return row;
  }

  async findMany(options: IFindContactsOptions): Promise<IContactListResult> {
    const where = this.buildFilters(options);
    const direction = options.sortOrder === SortOrder.ASC ? asc : desc;

    const [items, [total]] = await Promise.all([
      this.db
        .select()
        .from(contacts)
        .where(where)
        // id breaks ties so rows created in the same millisecond stay stable
        .orderBy(direction(contacts.createdAt), direction(contacts.id))
        .limit(options.limit)
        .offset(getOffset(options.page, options.limit)),
      this.db.select({ value: count() }).from(contacts).where(where),
    ]);

    return { items, totalItems: total?.value ?? 0 };
  }

  async create(data: INewContactRow): Promise<IContactRow> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db.insert(contacts).values(data).returning();

      return row;
    }, CONTACT_CONSTRAINT_MESSAGES);
  }

  async update(
    companyId: string,
    id: string,
    data: Partial<INewContactRow>,
  ): Promise<IContactRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(contacts)
        .set(data)
        .where(and(eq(contacts.id, id), eq(contacts.companyId, companyId)))
        .returning();

      return row;
    }, CONTACT_CONSTRAINT_MESSAGES);
  }

  // "Delete" is a status flip — the row is kept for audit and referential integrity
  async setStatus(
    companyId: string,
    id: string,
    status: boolean,
  ): Promise<IContactRow | undefined> {
    return this.update(companyId, id, { isActive: status });
  }

  private buildFilters(options: IFindContactsOptions): SQL | undefined {
    const conditions: SQL[] = [eq(contacts.companyId, options.companyId)];

    if (options.status !== undefined) {
      conditions.push(eq(contacts.isActive, options.status));
    }

    const search = buildSearchCondition(options.search, SEARCHABLE_COLUMNS);

    if (search) {
      conditions.push(search);
    }

    return and(...conditions);
  }
}
