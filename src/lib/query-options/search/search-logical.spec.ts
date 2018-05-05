import { OperatorLogical } from '../operator';
import { SearchLogical } from './search-logical';
import { Search } from './search';
import { SearchSimple } from './search-simple';
import { SearchPhrase } from './search-phrase';

describe('SearchLogical', () => {
  it('test toString', () => {
    let values: Search[];
    let operator: OperatorLogical;
    expect(() => new SearchLogical(values, operator)).toThrowError('values cannot be undefined');
    //
    values = null;
    expect(() => new SearchLogical(values, operator)).toThrowError('values cannot be null');
    //
    values = [];
    expect(() => new SearchLogical(values, operator)).toThrowError('operator cannot be undefined');
    //
    operator = null;
    expect(() => new SearchLogical(values, operator)).toThrowError('operator cannot be null');
    //
    operator = OperatorLogical.NOT;
    expect(() => new SearchLogical(values, operator)).toThrowError('values cannot be empty');
    //
    values = [new SearchSimple('value1'), new SearchSimple('value2')];
    expect(() => new SearchLogical(values, operator)).toThrowError('operator NOT requires a single value');
    //
    values = [new SearchSimple('value')];
    let search: SearchLogical = new SearchLogical(values, OperatorLogical.NOT);
    expect(search.toString()).toEqual('(NOT value)');
    //
    values = [new SearchSimple('v1'), new SearchSimple('v2')];
    search = new SearchLogical(values, OperatorLogical.AND);
    expect(search.toString()).toEqual('(v1 AND v2)');
    //
    search = new SearchLogical(values, OperatorLogical.OR);
    expect(search.toString()).toEqual('(v1 OR v2)');
    //
    values = [new SearchSimple('v1'), new SearchPhrase('v2 v3')];
    search = new SearchLogical(values, OperatorLogical.AND);
    expect(search.toString()).toEqual('(v1 AND "v2 v3")');
  });
});
