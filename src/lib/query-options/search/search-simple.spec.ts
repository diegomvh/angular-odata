import { SearchSimple } from './search-simple';

describe('SearchSimple', () => {
  it('test toString', () => {
    let value: string;
    expect(() => new SearchSimple(value)).toThrowError('value cannot be undefined');
    //
    value = null;
    expect(() => new SearchSimple(value)).toThrowError('value cannot be null');
    //
    value = '';
    expect(() => new SearchSimple(value)).toThrowError('value cannot be empty');
    //
    value = 'value';
    let searchSimple: SearchSimple = new SearchSimple(value);
    expect(searchSimple.toString()).toEqual('value');
    //
    value = 'value1 value2';
    searchSimple = new SearchSimple(value);
    expect(searchSimple.toString()).toEqual('value1 value2');
  });
});
