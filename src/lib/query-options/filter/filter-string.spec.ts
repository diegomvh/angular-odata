import { FilterString } from './filter-string';
import { Filter } from './filter';

describe('FilterString', () => {
  it('test toString', () => {
    let filter: string;
    expect(() => new FilterString(filter)).toThrowError('filter cannot be undefined');
    //
    filter = null;
    expect(() => new FilterString(filter)).toThrowError('filter cannot be null');
    //
    filter = '';
    expect(() => new FilterString(filter)).toThrowError('filter cannot be empty');
    //
    filter = 'property eq value';
    expect(filter.toString()).toEqual('property eq value');
  });

  it('test isEmpty', () => {
    const filter: Filter = new FilterString('value');
    expect(filter.isEmpty()).toBeFalsy();
    //
    filter['filter'] = '';
    expect(filter.isEmpty()).toBeTruthy();
    //
    filter['filter'] = undefined;
    expect(filter.isEmpty()).toBeTruthy();
    //
    filter['filter'] = null;
    expect(filter.isEmpty()).toBeTruthy();
  });
});
