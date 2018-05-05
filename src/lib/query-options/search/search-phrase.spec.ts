import { SearchPhrase } from './search-phrase';

describe('SearchPhrase', () => {
  it('test toString', () => {
    let value: string;
    expect(() => new SearchPhrase(value)).toThrowError('value cannot be undefined');
    //
    value = null;
    expect(() => new SearchPhrase(value)).toThrowError('value cannot be null');
    //
    value = '';
    expect(() => new SearchPhrase(value)).toThrowError('value cannot be empty');
    //
    value = 'value';
    let searchSimple: SearchPhrase = new SearchPhrase(value);
    expect(searchSimple.toString()).toEqual('"value"');
    //
    value = 'value1 value2';
    searchSimple = new SearchPhrase(value);
    expect(searchSimple.toString()).toEqual('"value1 value2"');
  });
});
