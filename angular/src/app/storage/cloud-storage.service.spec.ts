import {TestBed} from '@angular/core/testing';

import {CloudStorageService} from './cloud-storage.service';
import {AngularFireStorageModule} from '@angular/fire/storage';
import {AngularFireModule} from '@angular/fire';
import {environment} from '../../environments/environment';
import {HttpClientModule} from '@angular/common/http';

fdescribe('CloudStorageService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [
      AngularFireModule.initializeApp(environment.firebase),
      AngularFireStorageModule,
      HttpClientModule
    ]
  }));

  it('should be created', () => {
    const service: CloudStorageService = TestBed.get(CloudStorageService);
    expect(service).toBeTruthy();
  });

  it('find album', () => {
    const service: CloudStorageService = TestBed.get(CloudStorageService);
    const album = service.find('2');
    expect(album).toBeTruthy();
  });

  it('album get meta', async () => {
    const service: CloudStorageService = TestBed.get(CloudStorageService);
    const album = service.find('2');
    const meta = await album.getMeta();
    expect(meta).toBeTruthy();
  });
});
