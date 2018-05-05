import { OperatorComparison } from '../operator';
import { FilterHasProperty } from './filter-has-property';
import { FilterComparison } from './filter-comparison';

describe('FilterHasProperty', () => {
  it('test setProperty/getProperty', () => {
    const filter: FilterHasProperty = new FilterComparison('p1', OperatorComparison.EQ, 'value');
    expect(() => filter.setProperty(undefined)).toThrowError('property cannot be undefined');
    expect(() => filter.setProperty(null)).toThrowError('property cannot be null');
    filter.setProperty('p2');
    expect(filter.getProperty()).toEqual('p2');
  });
});
