// Storage adapter interfaces
// These define the contract between the repository layer and storage engines

export interface StorageAdapter {
  // Common storage interface methods
  initialize(): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface QueryAdapter {
  // Database query interface
  find<T>(collection: string, query: Partial<T>): Promise<T[]>;
  findOne<T>(collection: string, query: Partial<T>): Promise<T | null>;
  insert<T>(collection: string, data: T): Promise<number>;
  update<T>(collection: string, id: number, data: Partial<T>): Promise<void>;
  delete(collection: string, id: number): Promise<void>;
}
