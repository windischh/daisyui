import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactExportComponent } from './contact-export';

describe('ContactExport', () => {
  let component: ContactExportComponent;
  let fixture: ComponentFixture<ContactExportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactExportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactExportComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
