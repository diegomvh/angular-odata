import { FilterHasFilter } from './filter-has-filter';
import { FilterLogical } from './filter-logical';
import { OperatorLogical } from '../operator';
import { FilterString } from './filter-string';
import { LambdaCollection, LambdaOperator, FilterLambda } from './filter-lambda';
import { Filter } from './filter';

describe('FilterHasFilter', () => {
  it('test getFilter', () => {
    const filterString: FilterString = new FilterString('property eq value');
    let filterHasFilter: FilterHasFilter = new FilterLambda(LambdaCollection.ENTITY_SET, 'entitySet', LambdaOperator.ANY, filterString);
    expect(filterHasFilter.getFilter()).toBe(filterString);
    expect(filterHasFilter.getFilter().toString()).toEqual(filterString.toString());
    //
    const filterArray: Filter[] = [filterString];
    filterHasFilter = new FilterLogical(filterArray, OperatorLogical.NOT);
    expect(filterHasFilter.getFilter()).toBe(filterArray);
    expect(filterHasFilter.getFilter().toString()).toEqual(filterString.toString());
  });
});
