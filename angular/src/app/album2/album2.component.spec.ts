import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Album2Component } from './album2.component';

describe('Album2Component', () => {
  let component: Album2Component;
  let fixture: ComponentFixture<Album2Component>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Album2Component ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Album2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
