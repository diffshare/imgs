import {Injectable, Sanitizer} from '@angular/core';
import {IStorage} from './IStorage';
import {HttpClient} from '@angular/common/http';
import {AngularFireStorage} from '@angular/fire/storage';
import {Observable} from 'rxjs';
import {Utils} from '../utils/utils';
import {map, mergeMap} from 'rxjs/operators';

export class Photo {

  dataURL: string;

  constructor(public readonly meta: PhotoMeta, public readonly data: ArrayBuffer) {
    const blob = new Blob([data], {type: 'image/jpeg'});
    this.dataURL = URL.createObjectURL(blob);
  }
}

// #18 メタ情報への画像以外の情報の追加の検討
export interface IMeta {
  message: string;
}

export class PhotoMeta implements IMeta {
  constructor(public originalName: string) {
    // create ulid
  }

  canonicalName: string;
  message: string;
  size: number;
}

export enum OrderType {
  Default,
  ExifDate
}

enum LayoutType {
  Default
}

export class AlbumMeta {
  items: IMeta[] = [];
  order: OrderType = OrderType.Default;
  layout: LayoutType = LayoutType.Default;
}

export class LegacyAlbumMeta extends AlbumMeta {

  constructor(files: string[]) {
    super();

    files.forEach((value, index) => {
      const photo = new PhotoMeta(value);
      photo.canonicalName = value;
      this.items[index] = photo;
    });
  }
}

export class Album {

  constructor(
    public readonly album_id: string,
    private keyString: string,
    private storage: IStorage) {
    this.key = Utils.importKey(keyString);
  }

  get encrypted(): boolean {
    return this.keyString != null && this.keyString.length > 0;
  }

  key: Promise<CryptoKey>;
  meta: AlbumMeta;
  photos: Photo[];
  loading: boolean;

  getMeta(): Observable<AlbumMeta> {
    return this.storage.get(`${this.album_id}/filelist`).pipe(mergeMap(async response => {
      if (this.encrypted) {
        response = await Utils.decrypt(response, await this.key);
      }
      const json = Utils.bufferToString(response);
      const obj: Array<string> = JSON.parse(json);
      return new LegacyAlbumMeta(obj);
    }));
  }

  putMeta(meta: AlbumMeta) {
  }

  all(): Observable<Photo[]> {
    return Observable.create(async observer => {
      const meta = await this.getMeta().toPromise();
      const result: Photo[] = [];
      meta.items.forEach(async (item, index) => {
        if (item instanceof PhotoMeta) {
          let data = await this.storage.get(`${this.album_id}/${item.canonicalName}`).toPromise();
          if (this.encrypted) {
            data = await Utils.decrypt(data, await this.key);
          }
          const photo = new Photo(item, data);
          result[index] = photo;
          observer.next(result);
        }
      });
    });
  }

  get(photo_id: string): Photo {
    return null;
  }

  put(photo_id: string, data: ArrayBuffer) {
  }

  delete(photo_id) {
  }

  deleteSelf() {
  }
}

@Injectable({
  providedIn: 'root'
})
export class CloudStorageService implements IStorage {

  constructor(private storage: AngularFireStorage, private http: HttpClient) {
  }

  find(album_id: string, keyString: string): Album {
    return new Album(album_id, keyString, this);
  }

  get(path: string): Observable<ArrayBuffer> {
    const ref = this.storage.ref(path);
    return ref.getDownloadURL().pipe(mergeMap(url => this.http.get(url, {responseType: 'arraybuffer'})));
  }
}
