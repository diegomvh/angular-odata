import { FilterComparison } from './filter-comparison';
import { FilterLogical } from './filter-logical';
import { OperatorComparison, OperatorLogical } from '../operator';
import { Filter } from './filter';
import { FilterString } from './filter-string';

describe('FilterLogical', () => {
  it('test toString', () => {
    let filters: Filter[];
    let operator: OperatorLogical;
    expect(() => new FilterLogical(filters, operator)).toThrowError('filters cannot be undefined');
    //
    filters = null;
    expect(() => new FilterLogical(filters, operator)).toThrowError('filters cannot be null');
    //
    filters = [];
    expect(() => new FilterLogical(filters, operator)).toThrowError('filters cannot be empty');
    //
    filters = [new FilterComparison('property', OperatorComparison.EQ, 'value')];
    expect(() => new FilterLogical(filters, operator)).toThrowError('operator cannot be undefined');
    //
    operator = null;
    expect(() => new FilterLogical(filters, operator)).toThrowError('operator cannot be null');
    //
    operator = OperatorLogical.NOT;
    let filter: Filter = new FilterLogical(filters, operator);
    expect(filter.toString()).toEqual('(not property eq value)');
    //
    filters = [new FilterString('property eq v1'), new FilterString('property eq v2')];
    operator = OperatorLogical.AND;
    filter = new FilterLogical(filters, operator);
    expect(filter.toString()).toEqual('(property eq v1 and property eq v2)');
  });

  it('test isEmpty', () => {
    const filterString: Filter = new FilterString('property eq v1');
    const filterLogical: Filter = new FilterLogical([filterString], OperatorLogical.NOT);
    expect(filterLogical.isEmpty()).toBeFalsy();
    //
    filterString['filter'] = '';
    filterLogical['filters'] = [filterString];
    expect(filterLogical.isEmpty()).toBeTruthy();
    //
    filterLogical['filters'] = [];
    expect(filterLogical.isEmpty()).toBeTruthy();
    //
    filterLogical['filters'] = undefined;
    expect(filterLogical.isEmpty()).toBeTruthy();
    //
    filterLogical['filters'] = null;
    expect(filterLogical.isEmpty()).toBeTruthy();
  });
});
