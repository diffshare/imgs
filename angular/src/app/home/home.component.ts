import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {TitleService} from '../service/title.service';
import {AngularFireStorage} from '@angular/fire/storage';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.sass']
})
export class HomeComponent implements OnInit {

  albumName: string;

  constructor(
    private router: Router,
    private title: TitleService,
    private storage: AngularFireStorage
  ) {
  }

  ngOnInit() {
    this.title.setTitle('Home');
  }

  async createAlbum() {

    if (this.albumName == null || this.albumName.length === 0) {
      alert('アルバム名を入力してください。');
      return;
    }

    // アルバム名の利用チェック
    try {
      const ref = this.storage.ref(this.albumName + '/filelist');
      await ref.getMetadata().toPromise();
      alert('すでにアルバム名は利用されています。別の名前を入力してください。');
      return;
    } catch (e) {
    }

    window.crypto.subtle.generateKey({
      name: 'AES-GCM',
      length: 256
    }, true, ['encrypt', 'decrypt']).then(value => {
      window.crypto.subtle.exportKey('jwk', value).then(key => {
        this.router.navigate([this.albumName], {fragment: 'k=' + key.k});
      });
    });
  }
}
