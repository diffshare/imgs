import {Observable} from 'rxjs';

export interface IStorage {
  get(path: string): Observable<ArrayBuffer>;
}
