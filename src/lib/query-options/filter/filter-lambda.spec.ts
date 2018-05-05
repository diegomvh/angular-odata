import { OperatorComparison } from '../operator';
import { LambdaOperator, LambdaCollection } from './filter-lambda';
import { FilterLambda } from './filter-lambda';
import { Filter } from './filter';
import { FilterComparison } from './filter-comparison';

describe('FilterLambda', () => {
  it('test toString', () => {
    let lambdaCollection: LambdaCollection;
    let propertyOrEntitySet: string;
    let lambdaOperator: LambdaOperator;
    let filter: Filter;
    expect(() => new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter)).toThrowError('lambdaCollection cannot be undefined');
    //
    lambdaCollection = null;
    expect(() => new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter)).toThrowError('lambdaCollection cannot be null');
    //
    lambdaCollection = LambdaCollection.PROPERTY_COLLECTION;
    expect(() => new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter)).toThrowError('propertyOrEntitySet cannot be undefined');
    //
    propertyOrEntitySet = null;
    expect(() => new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter)).toThrowError('propertyOrEntitySet cannot be null');
    //
    propertyOrEntitySet = 'property';
    expect(() => new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter)).toThrowError('lambdaOperator cannot be undefined');
    //
    lambdaOperator = null;
    expect(() => new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter)).toThrowError('lambdaOperator cannot be null');
    //
    lambdaOperator = LambdaOperator.ANY;
    expect(() => new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter)).toThrowError('filter cannot be undefined');
    //
    filter = null;
    expect(() => new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter)).toThrowError('filter cannot be null');
    //
    lambdaCollection = LambdaCollection.PROPERTY_COLLECTION;
    propertyOrEntitySet = 'property';
    lambdaOperator = LambdaOperator.ANY;
    filter = new FilterComparison('property2', OperatorComparison.EQ, 'value');
    expect(() => new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter)).toThrowError('lambda property to filter must match inner filters property');
    //
    lambdaCollection = LambdaCollection.PROPERTY_COLLECTION;
    propertyOrEntitySet = 'property';
    lambdaOperator = LambdaOperator.ANY;
    filter = new FilterComparison('property', OperatorComparison.EQ, 'value');
    let filterLambda: FilterLambda = new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter);
    expect(filterLambda.toString()).toEqual('property/any(x:x eq value)');
    //
    lambdaCollection = LambdaCollection.PROPERTY_COLLECTION;
    propertyOrEntitySet = 'property';
    lambdaOperator = LambdaOperator.ALL;
    filter = new FilterComparison('property', OperatorComparison.EQ, 'value');
    filterLambda = new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter);
    expect(filterLambda.toString()).toEqual('property/all(x:x eq value)');
    //
    lambdaCollection = LambdaCollection.ENTITY_SET;
    propertyOrEntitySet = 'entitySet';
    lambdaOperator = LambdaOperator.ANY;
    filter = new FilterComparison('property', OperatorComparison.EQ, 'value');
    filterLambda = new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter);
    expect(filterLambda.toString()).toEqual('entitySet/any(x:x/property eq value)');
    //
    lambdaCollection = LambdaCollection.ENTITY_SET;
    propertyOrEntitySet = 'entitySet';
    lambdaOperator = LambdaOperator.ALL;
    filter = new FilterComparison('property', OperatorComparison.EQ, 'value');
    filterLambda = new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter);
    expect(filterLambda.toString()).toEqual('entitySet/all(x:x/property eq value)');
  });

  it('test isEmpty', () => {
    const lambdaCollection = LambdaCollection.ENTITY_SET;
    const propertyOrEntitySet = 'entitySet';
    const lambdaOperator = LambdaOperator.ANY;
    const filter = new FilterComparison('property', OperatorComparison.EQ, 'value');
    const filterLambda = new FilterLambda(lambdaCollection, propertyOrEntitySet, lambdaOperator, filter);
    expect(filterLambda.isEmpty()).toBeFalsy();
    //
    filterLambda['lambdaCollection'] = undefined;
    filterLambda['propertyOrEntitySet'] = undefined;
    filterLambda['lambdaOperator'] = undefined;
    filterLambda['filter'] = undefined;
    expect(filterLambda.isEmpty()).toBeTruthy();
    //
    filterLambda['lambdaCollection'] = null;
    filterLambda['propertyOrEntitySet'] = null;
    filterLambda['lambdaOperator'] = null;
    filterLambda['filter'] = null;
    expect(filterLambda.isEmpty()).toBeTruthy();
    //
    filterLambda['lambdaCollection'] = LambdaCollection.ENTITY_SET;
    filterLambda['propertyOrEntitySet'] = '';
    filterLambda['lambdaOperator'] = LambdaOperator.ANY;
    filterLambda['filter'] = null;
    expect(filterLambda.isEmpty()).toBeTruthy();
    //
    filterLambda['lambdaCollection'] = LambdaCollection.ENTITY_SET;
    filterLambda['propertyOrEntitySet'] = null;
    filterLambda['lambdaOperator'] = LambdaOperator.ANY;
    filterLambda['filter'] = [];
    expect(filterLambda.isEmpty()).toBeTruthy();
    //
    filterLambda['lambdaCollection'] = LambdaCollection.ENTITY_SET;
    filterLambda['propertyOrEntitySet'] = '';
    filterLambda['lambdaOperator'] = LambdaOperator.ANY;
    filterLambda['filter'] = [];
    expect(filterLambda.isEmpty()).toBeTruthy();
  });
});
