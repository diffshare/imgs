import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {HomeComponent} from './home/home.component';
import {AlbumComponent} from './album/album.component';
import {PhotoComponent} from './photo/photo.component';

const routes: Routes = [
  {path: ':album_id', component: AlbumComponent, children: [
      {path: ':photo_id', component: PhotoComponent},
  ]},
  {path: '', component: HomeComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
