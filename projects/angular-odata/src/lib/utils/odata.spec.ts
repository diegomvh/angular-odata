import type { ODataCallableConfig } from '../types';

import { OData } from './odata';

// The runtime shape of a callable is looser than ODataCallableConfig, parameters are
// merged by name and compared on the bindingParameter, so build them through a helper.
const callable = (name: string, parameters?: { [name: string]: any }): ODataCallableConfig =>
  ({ name, parameters }) as ODataCallableConfig;

const param = (type: string) => ({ type });

describe('OData', () => {
  describe('mergeCallableParameters', () => {
    it('should return an empty array for no callables', () => {
      expect(OData.mergeCallableParameters([])).toEqual([]);
    });

    it('should keep a single callable untouched', () => {
      const callables = [callable('GetPeople', { p: param('Edm.String') })];
      expect(OData.mergeCallableParameters(callables)).toEqual([
        { name: 'GetPeople', parameters: { p: { type: 'Edm.String' } } },
      ]);
    });

    it('should keep callables with a different name', () => {
      const merged = OData.mergeCallableParameters([
        callable('GetPeople', { p: param('Edm.String') }),
        callable('GetPlaces', { p: param('Edm.String') }),
      ]);
      expect(merged.length).toBe(2);
      expect(merged.map((c) => c.name)).toEqual(['GetPeople', 'GetPlaces']);
    });

    it('should merge callables with the same name and no binding parameter', () => {
      const merged = OData.mergeCallableParameters([
        callable('GetPeople', { p1: param('Edm.String') }),
        callable('GetPeople', { p2: param('Edm.Int32') }),
        callable('GetPeople', { p3: param('Edm.Boolean') }),
      ]);
      expect(merged.length).toBe(1);
      expect(merged[0].parameters).toEqual({
        p1: { type: 'Edm.String' },
        p2: { type: 'Edm.Int32' },
        p3: { type: 'Edm.Boolean' },
      });
    });

    it('should not merge callables bound to a different entity', () => {
      const merged = OData.mergeCallableParameters([
        callable('GetPeople', { bindingParameter: { Id: param('Edm.Int32') } }),
        callable('GetPeople', { bindingParameter: { Id: param('Edm.String') } }),
      ]);
      expect(merged.length).toBe(2);
    });

    it('should merge callables bound to the same entity', () => {
      const merged = OData.mergeCallableParameters([
        callable('GetPeople', {
          bindingParameter: { Id: param('Edm.Int32') },
          p1: param('Edm.String'),
        }),
        callable('GetPeople', {
          bindingParameter: { Id: param('Edm.Int32') },
          p2: param('Edm.Int32'),
        }),
      ]);
      expect(merged.length).toBe(1);
      expect(merged[0].parameters).toEqual({
        bindingParameter: { Id: { type: 'Edm.Int32' } },
        p1: { type: 'Edm.String' },
        p2: { type: 'Edm.Int32' },
      });
    });

    it('should treat a callable without parameters and one with parameters as mergeable', () => {
      const merged = OData.mergeCallableParameters([
        callable('GetPeople'),
        callable('GetPeople', { p: param('Edm.String') }),
      ]);
      expect(merged.length).toBe(1);
      expect(merged[0].parameters).toEqual({ p: { type: 'Edm.String' } });
    });

    it('should let a later parameter override an earlier one', () => {
      const merged = OData.mergeCallableParameters([
        callable('GetPeople', { p: param('Edm.String') }),
        callable('GetPeople', { p: param('Edm.Int32') }),
      ]);
      expect(merged.length).toBe(1);
      expect(merged[0].parameters).toEqual({ p: { type: 'Edm.Int32' } });
    });
  });
});
