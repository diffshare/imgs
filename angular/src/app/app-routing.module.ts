import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {HomeComponent} from './home/home.component';
import {AlbumComponent} from './album/album.component';
import {PhotoComponent} from './photo/photo.component';
import {Album2Component} from './album2/album2.component';

const routes: Routes = [
  {path: ':album_id', component: Album2Component, children: [
      {path: ':photo_id', component: PhotoComponent},
  ]},
  {path: '', component: HomeComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
