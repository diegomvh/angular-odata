import { QuotedString } from '../../odata-query/quoted-string';
import { OperatorComparison } from '../operator';
import { FilterComparison } from './filter-comparison';

describe('FilterComparison', () => {
  it('test toString', () => {
    let property: string;
    let operator: OperatorComparison;
    let value: boolean | number | string | QuotedString;
    expect(() => new FilterComparison(property, operator, value)).toThrowError('property cannot be undefined');
    //
    property = null;
    expect(() => new FilterComparison(property, operator, value)).toThrowError('property cannot be null');
    //
    property = 'property';
    expect(() => new FilterComparison(property, operator, value)).toThrowError('operator cannot be undefined');
    //
    operator = null;
    expect(() => new FilterComparison(property, operator, value)).toThrowError('operator cannot be null');
    //
    operator = OperatorComparison.EQ;
    expect(() => new FilterComparison(property, operator, value)).toThrowError('value cannot be undefined');
    //
    value = null;
    expect(new FilterComparison(property, operator, value).toString()).toEqual('property eq null');
    //
    value = 'value';
    expect(new FilterComparison(property, operator, value).toString()).toEqual('property eq value');
    //
    operator = OperatorComparison.GE;
    expect(new FilterComparison(property, operator, value).toString()).toEqual('property ge value');
    //
    operator = OperatorComparison.GT;
    expect(new FilterComparison(property, operator, value).toString()).toEqual('property gt value');
    //
    operator = OperatorComparison.LE;
    expect(new FilterComparison(property, operator, value).toString()).toEqual('property le value');
    //
    operator = OperatorComparison.LT;
    expect(new FilterComparison(property, operator, value).toString()).toEqual('property lt value');
    //
    operator = OperatorComparison.NE;
    expect(new FilterComparison(property, operator, value).toString()).toEqual('property ne value');
    //
    property = 'Style';
    operator = OperatorComparison.HAS;
    value = 'Sales.Color\'Yellow\'';
    expect(new FilterComparison(property, operator, value).toString()).toEqual('Style has Sales.Color\'Yellow\'');
  });
});
