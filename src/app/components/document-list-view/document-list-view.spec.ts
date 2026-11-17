import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentListView } from './document-list-view';

describe('DocumentListView', () => {
  let component: DocumentListView;
  let fixture: ComponentFixture<DocumentListView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentListView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentListView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
