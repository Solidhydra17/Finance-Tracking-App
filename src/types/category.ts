export type CategoryType = 'income' | 'expense' | 'both';

export interface Category {
  id?: number;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  isCustom: boolean;
}

export interface CategoryCreate {
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  isCustom: boolean;
}
