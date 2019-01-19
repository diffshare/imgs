export interface IStorage {
  get(path: string): Promise<ArrayBuffer>;
}
