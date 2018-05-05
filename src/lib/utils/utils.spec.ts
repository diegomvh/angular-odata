import { OperatorLogical } from '../query-options/operator';
import { Utils } from './utils';
import { QuotedString } from '../odata-query/quoted-string';

describe('Utils', () => {
  const fieldName = 'fieldName';

  it('test requireNullOrUndefined', () => {
    let fieldValue: any;
    Utils.requireNullOrUndefined(fieldValue, fieldName);
    //
    fieldValue = null;
    Utils.requireNullOrUndefined(fieldValue, fieldName);
    //
    fieldValue = {};
    expect(() => Utils.requireNullOrUndefined(fieldValue, fieldName)).toThrowError(fieldName + ' must be null or undefined');
  });

  it('test requireNotEmpty', () => {
    let fieldValue: any;
    expect(() => Utils.requireNotEmpty(fieldValue, fieldName)).toThrowError(fieldName + ' cannot be empty');
    //
    fieldValue = null;
    expect(() => Utils.requireNotEmpty(fieldValue, fieldName)).toThrowError(fieldName + ' cannot be empty');
    //
    fieldValue = '';
    expect(() => Utils.requireNotEmpty(fieldValue, fieldName)).toThrowError(fieldName + ' cannot be empty');
    //
    fieldValue = [];
    expect(() => Utils.requireNotEmpty(fieldValue, fieldName)).toThrowError(fieldName + ' cannot be empty');
    //
    fieldValue = { isEmpty(): boolean { return true; } };
    expect(() => Utils.requireNotEmpty(fieldValue, fieldName)).toThrowError(fieldName + ' cannot be empty');
    //
    fieldValue = [''];
    expect(() => Utils.requireNotEmpty(fieldValue, fieldName)).toThrowError(fieldName + ' cannot be empty');
    //
    fieldValue = [{ isEmpty(): boolean { return true; } }];
    expect(() => Utils.requireNotEmpty(fieldValue, fieldName)).toThrowError(fieldName + ' cannot be empty');
    //
    fieldValue = { isEmpty(): boolean { return; } };
    Utils.requireNotEmpty(fieldValue, fieldName);
    //
    fieldValue = { isEmpty(): boolean { return null; } };
    Utils.requireNotEmpty(fieldValue, fieldName);
    //
    fieldValue = {};
    Utils.requireNotEmpty(fieldValue, fieldName);
  });

  it('test appendSegment', () => {
    let path: string;
    let segment: string;
    expect(() => Utils.appendSegment(path, segment)).toThrowError('path cannot be undefined');
    //
    path = '';
    expect(() => Utils.appendSegment(path, segment)).toThrowError('segment cannot be undefined');
    //
    path = null;
    expect(() => Utils.appendSegment(path, segment)).toThrowError('path cannot be null');
    //
    path = '';
    segment = null;
    expect(() => Utils.appendSegment(path, segment)).toThrowError('segment cannot be null');
    //
    path = '';
    segment = '';
    expect(Utils.appendSegment(path, segment)).toEqual('/');
    //
    path = 'p';
    segment = 's';
    expect(Utils.appendSegment(path, segment)).toEqual('p/s');
    //
    path = 'p/';
    segment = 's';
    expect(Utils.appendSegment(path, segment)).toEqual('p/s');
    //
    path = 'p/';
    segment = '/s';
    expect(Utils.appendSegment(path, segment)).toEqual('p//s');
  });

  it('test removeEndingSeparator', () => {
    let value: string;
    expect(() => Utils.removeEndingSeparator(value)).toThrowError('value cannot be undefined');
    //
    value = null;
    expect(() => Utils.removeEndingSeparator(value)).toThrowError('value cannot be null');
    //
    value = '';
    expect(Utils.removeEndingSeparator(value)).toEqual('');
    //
    value = 'v';
    expect(Utils.removeEndingSeparator(value)).toEqual('v');
    //
    value = '/';
    expect(Utils.removeEndingSeparator(value)).toEqual('');
    //
    value = 'v/';
    expect(Utils.removeEndingSeparator(value)).toEqual('v');
  });

  it('test getValueURI', () => {
    let value: any;
    let encodeURI: any;
    expect(() => Utils.getValueURI(value, encodeURI)).toThrowError('value cannot be undefined');
    //
    value = 'value';
    expect(() => Utils.getValueURI(value, encodeURI)).toThrowError('encodeURI cannot be undefined');
    //
    encodeURI = null;
    expect(() => Utils.getValueURI(value, encodeURI)).toThrowError('encodeURI cannot be null');
    //
    value = null;
    expect(Utils.getValueURI(value, true)).toEqual(null);
    expect(Utils.getValueURI(value, false)).toEqual(null);
    //
    value = true;
    expect(Utils.getValueURI(value, true)).toEqual(true);
    expect(Utils.getValueURI(value, false)).toEqual(true);
    //
    value = 10;
    expect(Utils.getValueURI(value, true)).toEqual(10);
    expect(Utils.getValueURI(value, false)).toEqual(10);
    //
    value = 'v';
    expect(Utils.getValueURI(value, true)).toEqual('v');
    expect(Utils.getValueURI(value, false)).toEqual('v');
    //
    value = new Date();
    expect(Utils.getValueURI(value.toISOString(), true)).toEqual(encodeURIComponent(value.toISOString()));
    expect(Utils.getValueURI(value.toISOString(), false)).toEqual(value.toISOString());
    expect(Utils.getValueURI(value.toLocaleString(), true)).toEqual(encodeURIComponent(value.toLocaleString()));
    expect(Utils.getValueURI(value.toLocaleString(), false)).toEqual(value.toLocaleString());
    //
    value = new QuotedString('O\'Reilly/');
    expect(Utils.getValueURI(value, true)).toEqual('\'O\'\'Reilly%2F\'');
    expect(Utils.getValueURI(value, false)).toEqual('\'O\'\'Reilly/\'');
    //
    value = '2017-01-01';
    expect(Utils.getValueURI(value, true)).toEqual('2017-01-01');
    expect(Utils.getValueURI(value, false)).toEqual('2017-01-01');
    //
    value = '2017/01/01';
    expect(Utils.getValueURI(value, true)).toEqual('2017%2F01%2F01');
    expect(Utils.getValueURI(value, false)).toEqual('2017/01/01');
  });

  it('test toString', () => {
    let items: any;
    expect(Utils.toString(items)).toEqual('');
    //
    items = null;
    expect(Utils.toString(items)).toEqual('');
    //
    items = ['v1', 'v2'];
    expect(Utils.toString(items)).toEqual('v1,v2');
    //
    items = [{ toString() { return 'v1'; } }, { toString() { return 'v2'; } }];
    expect(Utils.toString(items)).toEqual('v1,v2');
    //
    items = ['v1', 'v2'];
    expect(Utils.toString(items, OperatorLogical.AND)).toEqual('(v1 and v2)');
    //
    items = ['v1'];
    expect(Utils.toString(items, OperatorLogical.NOT)).toEqual('(not v1)');
    //
    items = ['v1', 'v2'];
    expect(Utils.toString(items, OperatorLogical.AND, true)).toEqual('(v1 AND v2)');
    //
    items = ['v1'];
    expect(Utils.toString(items, OperatorLogical.NOT, true)).toEqual('(NOT v1)');
  });
});
