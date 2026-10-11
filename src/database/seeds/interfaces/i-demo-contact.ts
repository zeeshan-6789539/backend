export interface IDemoContact {
  key: string;
  name: string;
  phone: string;
  email?: string;
  cnic?: string;
  address?: string;
  notes?: string;
  createdDaysAgo: number;
  deactivatedDaysAgo?: number;
}
