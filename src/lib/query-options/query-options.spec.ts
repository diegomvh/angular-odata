import { Orderby } from './orderby';
import { Expand } from './expand';
import { OperatorComparison } from './operator';
import { QueryOptions } from './query-options';
import { Search } from './search/search';
import { SearchSimple } from './search/search-simple';
import { Filter } from './filter/filter';
import { FilterComparison } from './filter/filter-comparison';
import { ODataQuery } from '../odata-query/odata-query';

describe('QueryOptions', () => {
  it('test select', () => {
    const queryOptions: QueryOptions = new QueryOptions(ODataQuery.SEPARATOR);
    queryOptions.select(undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.select(null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.select([]);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.select('value');
    expect(queryOptions.toString()).toEqual('$select=value');
    //
    queryOptions.select(['value']);
    expect(queryOptions.toString()).toEqual('$select=value');
  });

  it('test filter', () => {
    const queryOptions: QueryOptions = new QueryOptions(ODataQuery.SEPARATOR);
    queryOptions.filter(undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.filter(null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.filter('');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.filter('property eq value');
    expect(queryOptions.toString()).toEqual('$filter=' + encodeURIComponent('property eq value'));
    //
    queryOptions.filter(new FilterComparison('property', OperatorComparison.EQ, 'value'));
    expect(queryOptions.toString()).toEqual('$filter=' + encodeURIComponent('property eq value'));
  });

  it('test expand', () => {
    const queryOptions: QueryOptions = new QueryOptions(ODataQuery.SEPARATOR);
    queryOptions.expand(undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.expand(null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.expand('');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.expand([]);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.expand('value');
    expect(queryOptions.toString()).toEqual('$expand=value');
    //
    queryOptions.expand([new Expand('value')]);
    expect(queryOptions.toString()).toEqual('$expand=value');
  });

  it('test orderby', () => {
    const queryOptions: QueryOptions = new QueryOptions(ODataQuery.SEPARATOR);
    queryOptions.orderby(undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.orderby(null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.orderby('');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.orderby([]);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.orderby('value');
    expect(queryOptions.toString()).toEqual('$orderby=value');
    //
    queryOptions.orderby([new Orderby('value')]);
    expect(queryOptions.toString()).toEqual('$orderby=value');
  });

  it('test search', () => {
    const queryOptions: QueryOptions = new QueryOptions(ODataQuery.SEPARATOR);
    queryOptions.search(undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.search(null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.search('');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.search('value');
    expect(queryOptions.toString()).toEqual('$search=' + encodeURIComponent('value'));
    //
    queryOptions.search(new SearchSimple('value'));
    expect(queryOptions.toString()).toEqual('$search=' + encodeURIComponent('value'));
    //
    queryOptions.search(new SearchSimple('null'));
    expect(queryOptions.toString()).toEqual('$search=' + encodeURIComponent('null'));
  });

  it('test skip', () => {
    const queryOptions: QueryOptions = new QueryOptions(ODataQuery.SEPARATOR);
    queryOptions.skip(undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.skip(null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.skip(0);
    expect(queryOptions.toString()).toEqual('$skip=0');
    //
    expect(() => queryOptions.skip(-1)).toThrowError('skip cannot be negative');
  });

  it('test top', () => {
    const queryOptions: QueryOptions = new QueryOptions(ODataQuery.SEPARATOR);
    queryOptions.top(undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.top(null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.top(0);
    expect(queryOptions.toString()).toEqual('$top=0');
    //
    expect(() => queryOptions.top(-1)).toThrowError('top cannot be negative');
  });

  it('test count', () => {
    const queryOptions: QueryOptions = new QueryOptions(ODataQuery.SEPARATOR);
    queryOptions.count(undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.count(null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.count(true);
    expect(queryOptions.toString()).toEqual('$count=true');
    //
    queryOptions.count(false);
    expect(queryOptions.toString()).toEqual('$count=false');
  });

  it('test format', () => {
    const queryOptions: QueryOptions = new QueryOptions(ODataQuery.SEPARATOR);
    queryOptions.format(undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.format(null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.format('');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.format('json');
    expect(queryOptions.toString()).toEqual('$format=json');
  });

  it('test customOption', () => {
    const queryOptions: QueryOptions = new QueryOptions(ODataQuery.SEPARATOR);
    expect(() => queryOptions.customOption(undefined, undefined)).toThrowError('key cannot be undefined');
    //
    expect(() => queryOptions.customOption(null, null)).toThrowError('key cannot be null');
    //
    queryOptions.customOption('key', undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.customOption('key', null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.customOption('key', 'value');
    expect(queryOptions.toString()).toEqual('key=' + encodeURIComponent('value'));
    //
    queryOptions.customOption('key2', 'value2');
    expect(queryOptions.toString()).toEqual('key=' + encodeURIComponent('value') + '&key2=' + encodeURIComponent('value2'));
  });

  it('test toString', () => {
    let queryOptions: QueryOptions = new QueryOptions(ODataQuery.SEPARATOR)
      .select(['value'])
      .filter('property eq value')
      .expand([new Expand('entitySet')])
      .orderby([new Orderby('property')])
      .search(new SearchSimple('value'))
      .skip(10)
      .top(20)
      .count(true);
    expect(queryOptions.toString()).toEqual('$select=value&$filter=' + encodeURIComponent('property eq value') + '&$expand=entitySet&$orderby=property&$search=' + encodeURIComponent('value') + '&$skip=10&$top=20&$count=true');
    //
    queryOptions = new QueryOptions(Expand.SEPARATOR)
      .select(['value'])
      .filter('property eq value')
      .expand([new Expand('entitySet')])
      .orderby([new Orderby('property')])
      .search(new SearchSimple('value'))
      .skip(10)
      .top(20)
      .count(true);
    expect(queryOptions.toString()).toEqual('$select=value;$filter=' + encodeURIComponent('property eq value') + ';$expand=entitySet;$orderby=property;$search=' + encodeURIComponent('value') + ';$skip=10;$top=20;$count=true');
  });

  it('test isEmpty', () => {
    const queryOptions: QueryOptions = new QueryOptions(Expand.SEPARATOR);
    expect(queryOptions.isEmpty()).toBeTruthy();
  });
});
