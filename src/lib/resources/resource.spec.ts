import { TestBed, async } from '@angular/core/testing';
import { ODataClient } from '../client';

describe('ODataResource', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      providers: [ODataClient]
    }).compileComponents();
  }));
});
