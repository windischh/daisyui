import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentAlbumView } from './document-album-view';

describe('DocumentAlbumView', () => {
  let component: DocumentAlbumView;
  let fixture: ComponentFixture<DocumentAlbumView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentAlbumView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentAlbumView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
