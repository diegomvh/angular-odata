import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AngularOdataComponent } from './angular-odata.component';

describe('AngularOdataComponent', () => {
  let component: AngularOdataComponent;
  let fixture: ComponentFixture<AngularOdataComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AngularOdataComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AngularOdataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
