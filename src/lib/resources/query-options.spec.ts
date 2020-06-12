import { ODataQueryOptions, QueryOptionNames } from './query-options';

describe('ODataQueryOptions', () => {
  it('test select', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    queryOptions.option(QueryOptionNames.select, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.select, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.select, []);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.select, "value");
    expect(queryOptions.toString()).toEqual('$select=value');
    //
    queryOptions.option(QueryOptionNames.select, ["value"]);
    expect(queryOptions.toString()).toEqual('$select=value');
  });

  it('test filter', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    queryOptions.option(QueryOptionNames.filter, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.filter, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.filter, '');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.filter, {property: 'value'});
    expect(queryOptions.toString()).toEqual("$filter=property eq 'value'");
    //
    queryOptions.option(QueryOptionNames.filter, {property: { ne: 'value' }});
    expect(queryOptions.toString()).toEqual("$filter=property ne 'value'");
  });

  it('test expand', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    queryOptions.option(QueryOptionNames.expand, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.expand, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.expand, '');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.expand, []);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.expand, 'value');
    expect(queryOptions.toString()).toEqual('$expand=value');
    //
    queryOptions.option(QueryOptionNames.expand, ['value']);
    expect(queryOptions.toString()).toEqual('$expand=value');
  });

  it('test orderby', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    queryOptions.option(QueryOptionNames.orderBy, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.orderBy, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.orderBy, '');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.orderBy, []);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.orderBy, 'value');
    expect(queryOptions.toString()).toEqual('$orderby=value');
    //
    queryOptions.option(QueryOptionNames.orderBy, [['value', 'asc']]);
    expect(queryOptions.toString()).toEqual('$orderby=value asc');
  });

  it('test search', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    queryOptions.option(QueryOptionNames.search, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.search, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.search, '');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.search, 'value');
    expect(queryOptions.toString()).toEqual('$search=' + encodeURIComponent('value'));
    //
    queryOptions.option(QueryOptionNames.search, ['value']);
    expect(queryOptions.toString()).toEqual('$search=' + encodeURIComponent('value'));
    //
    queryOptions.option(QueryOptionNames.search, 'null');
    expect(queryOptions.toString()).toEqual('$search=' + encodeURIComponent('null'));
  });

  it('test skip', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    queryOptions.option(QueryOptionNames.skip, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.skip, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.skip, 0);
    expect(queryOptions.toString()).toEqual('');
  });

  it('test top', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    queryOptions.option(QueryOptionNames.top, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.top, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.top, 0);
    expect(queryOptions.toString()).toEqual('$top=0');
  });

  it('test format', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    queryOptions.option(QueryOptionNames.format, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.format, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.format, '');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.format, 'json');
    expect(queryOptions.toString()).toEqual('$format=json');
  });

  it('test customOption', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    queryOptions.option(QueryOptionNames.custom, undefined);
    expect(queryOptions.toString()).toEqual('');
    //expect(() => queryOptions.customOption(undefined, undefined)).toThrowError('key cannot be undefined');
    //
    //expect(() => queryOptions.customOption(null, null)).toThrowError('key cannot be null');
    //
    queryOptions.option(QueryOptionNames.custom, {key: undefined});
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.custom, {key: null});
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOptionNames.custom, {key: 'value'});
    expect(queryOptions.toString()).toEqual('key=' + encodeURIComponent('value'));
    //
    queryOptions.option(QueryOptionNames.custom, {key: 'value', key2: 'value2'});
    expect(queryOptions.toString()).toEqual('key=' + encodeURIComponent('value') + '&key2=' + encodeURIComponent('value2'));
  });

  it('test toString', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    queryOptions.option(QueryOptionNames.select, ['value']);
    queryOptions.option(QueryOptionNames.filter, 'property eq value');
    queryOptions.option(QueryOptionNames.expand, 'entitySet');
    queryOptions.option(QueryOptionNames.orderBy, 'property');
    queryOptions.option(QueryOptionNames.search, 'value');
    queryOptions.option(QueryOptionNames.skip, 10);
    queryOptions.option(QueryOptionNames.top, 20);
    expect(queryOptions.params()).toEqual({$select: 'value', $filter: 'property eq value', $expand: 'entitySet', $orderby: 'property', $search: 'value', $skip: '10', $top: '20'});
  });

  it('test isEmpty', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    expect(queryOptions.toString()).toEqual('');
  });
});
