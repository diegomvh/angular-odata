import { FilterStartswith, FilterEndswith, FilterContains, FilterLength, FilterIndexof, FilterSubstring, FilterTolower, FilterToupper, FilterTrim, FilterConcat } from './filter-function';

describe('FilterFunction', () => {
  it('test string functions', () => {
    expect(new FilterContains('property', 'value').toString()).toEqual('contains(property,\'value\')');
    expect(() => new FilterContains(undefined, undefined)).toThrowError('property cannot be undefined');
    expect(() => new FilterContains(null, undefined)).toThrowError('property cannot be null');
    expect(() => new FilterContains('property', undefined)).toThrowError('value cannot be undefined');
    expect(() => new FilterContains('property', null)).toThrowError('value cannot be null');
    //
    expect(new FilterEndswith('property', 'value').toString()).toEqual('endswith(property,\'value\')');
    expect(() => new FilterEndswith(undefined, undefined)).toThrowError('property cannot be undefined');
    expect(() => new FilterEndswith(null, undefined)).toThrowError('property cannot be null');
    expect(() => new FilterEndswith('property', undefined)).toThrowError('value cannot be undefined');
    expect(() => new FilterEndswith('property', null)).toThrowError('value cannot be null');
    //
    expect(new FilterStartswith('property', 'value').toString()).toEqual('startswith(property,\'value\')');
    expect(() => new FilterStartswith(undefined, undefined)).toThrowError('property cannot be undefined');
    expect(() => new FilterStartswith(null, undefined)).toThrowError('property cannot be null');
    expect(() => new FilterStartswith('property', undefined)).toThrowError('value cannot be undefined');
    expect(() => new FilterStartswith('property', null)).toThrowError('value cannot be null');
    //
    expect(new FilterLength('property').toString()).toEqual('length(property)');
    expect(() => new FilterLength(undefined)).toThrowError('property cannot be undefined');
    expect(() => new FilterLength(null)).toThrowError('property cannot be null');
    //
    expect(new FilterIndexof('property', 'value').toString()).toEqual('indexof(property,\'value\')');
    expect(() => new FilterIndexof(undefined, undefined)).toThrowError('property cannot be undefined');
    expect(() => new FilterIndexof(null, undefined)).toThrowError('property cannot be null');
    expect(() => new FilterIndexof('property', undefined)).toThrowError('value cannot be undefined');
    expect(() => new FilterIndexof('property', null)).toThrowError('value cannot be null');
    //
    expect(new FilterSubstring('property', 1).toString()).toEqual('substring(property,1)');
    expect(() => new FilterSubstring(undefined, undefined)).toThrowError('property cannot be undefined');
    expect(() => new FilterSubstring(null, undefined)).toThrowError('property cannot be null');
    expect(() => new FilterSubstring('property', undefined)).toThrowError('value cannot be undefined');
    expect(() => new FilterSubstring('property', null)).toThrowError('value cannot be null');
    //
    expect(new FilterTolower('property').toString()).toEqual('tolower(property)');
    expect(() => new FilterTolower(undefined)).toThrowError('property cannot be undefined');
    expect(() => new FilterTolower(null)).toThrowError('property cannot be null');
    //
    expect(new FilterToupper('property').toString()).toEqual('toupper(property)');
    expect(() => new FilterToupper(undefined)).toThrowError('property cannot be undefined');
    expect(() => new FilterToupper(null)).toThrowError('property cannot be null');
    //
    expect(new FilterTrim('property').toString()).toEqual('trim(property)');
    expect(() => new FilterTrim(undefined)).toThrowError('property cannot be undefined');
    expect(() => new FilterTrim(null)).toThrowError('property cannot be null');
    //
    expect(new FilterConcat('property', 'value').toString()).toEqual('concat(property,\'value\')');
    expect(() => new FilterConcat(undefined, undefined)).toThrowError('property cannot be undefined');
    expect(() => new FilterConcat(null, undefined)).toThrowError('property cannot be null');
    expect(() => new FilterConcat('property', undefined)).toThrowError('value cannot be undefined');
    expect(() => new FilterConcat('property', null)).toThrowError('value cannot be null');
  });
});
