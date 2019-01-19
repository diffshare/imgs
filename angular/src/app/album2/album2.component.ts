import {Component, OnInit} from '@angular/core';
import {Album, AlbumMeta, CloudStorageService, Photo} from '../storage/cloud-storage.service';
import {combineLatest, Observable} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {DomSanitizer} from '@angular/platform-browser';

@Component({
  selector: 'app-album2',
  templateUrl: './album2.component.html',
  styleUrls: ['./album2.component.sass']
})
export class Album2Component implements OnInit {
  album: Album;
  meta: Observable<AlbumMeta>;
  photos: Observable<Photo[]>;
  elapsed: number;

  constructor(
    private route: ActivatedRoute,
    private storage: CloudStorageService,
    private sanitizer: DomSanitizer
  ) {
  }

  sanitizeUrl(url: string) {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  ngOnInit() {
    combineLatest(
      this.route.fragment,
      this.route.params
    ).subscribe(value => {
      const keyString = value[0].substring(2);
      const album_id = value[1].album_id;
      this.album = this.storage.find(album_id, keyString);
      this.load();
    });
  }

  async load() {
    const firstTime = new Date();
    this.meta = this.album.getMeta();
    this.photos = this.album.all();
    await this.photos.subscribe(value => {
        this.elapsed = new Date().getTime() - firstTime.getTime();
    });
  }
}
