import { TestBed } from '@angular/core/testing';

import { AngularOdataService } from './angular-odata.service';

describe('AngularOdataService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AngularOdataService = TestBed.get(AngularOdataService);
    expect(service).toBeTruthy();
  });
});
