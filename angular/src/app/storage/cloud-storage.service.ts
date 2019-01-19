import {Injectable, Sanitizer} from '@angular/core';
import {IStorage} from './IStorage';
import {HttpClient} from '@angular/common/http';
import {AngularFireStorage} from '@angular/fire/storage';
import {Observable} from 'rxjs';

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
  orderBy: OrderType = OrderType.Default;
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
    this.key = Album.importKey(keyString);
  }

  get encrypted(): boolean {
    return this.keyString != null && this.keyString.length > 0;
  }

  key: Promise<CryptoKey>;
  meta: AlbumMeta;
  photos: Photo[];
  loading: boolean;

  static bufferToString(buf) {
    return String.fromCharCode.apply('', new Uint16Array(buf));
  }

  private static async importKey(keyString: string) {
    return await window.crypto.subtle.importKey(
      'jwk',
      {
        kty: 'oct',
        k: keyString,
        alg: 'A256GCM',
        ext: true,
      },
      {
        name: 'AES-GCM',
        length: 256
      },
      false, // whether the key is extractable (i.e. can be used in exportKey)
      ['encrypt', 'decrypt'] // can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    );
  }

  private static async decrypt(response: ArrayBuffer, key: CryptoKey) {
    const iv = response.slice(0, 12);
    const data = response.slice(12);
    return await window.crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: iv
    }, key, data);
  }

  async getMeta(): Promise<AlbumMeta> {
    let response = await this.storage.get(`${this.album_id}/filelist`);
    if (this.encrypted) {
      response = await Album.decrypt(response, await this.key);
    }
    const json = Album.bufferToString(response);
    const obj: Array<string> = JSON.parse(json);
    return new LegacyAlbumMeta(obj);
  }

  putMeta(meta: AlbumMeta) {
  }

  all(): Observable<Photo[]> {

    return Observable.create(async observer => {
      const result: Photo[] = [];
      const meta = await this.getMeta();
      meta.items.forEach(async (item, index) => {
        if (item instanceof PhotoMeta) {
          let data = await this.storage.get(`${this.album_id}/${item.canonicalName}`);
          if (this.encrypted) {
            data = await Album.decrypt(data, await this.key);
          }
          const photo = new Photo(item, data);
          result[index] = photo;
          observer.next(result);
          if (observer.completedCount === meta.items.length) {
            observer.complete();
          }
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

  async get(path: string): Promise<ArrayBuffer> {
    const ref = this.storage.ref(path);
    const url = await ref.getDownloadURL().toPromise();
    return await this.http.get(url, {responseType: 'arraybuffer'}).toPromise();
  }
}
