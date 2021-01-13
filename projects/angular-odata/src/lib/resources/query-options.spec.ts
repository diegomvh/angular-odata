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
    expect(queryOptions.toString()).toEqual('$skip=0');
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

  it('test value top', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    const handler = queryOptions.option(QueryOptionNames.top, 1);
    expect(queryOptions.toString()).toEqual('$top=1');
    expect(handler.value()).toEqual(1);
    handler.value(4);
    expect(queryOptions.toString()).toEqual('$top=4');
  });

  it('test clear by handler', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    const handler = queryOptions.option(QueryOptionNames.top, 1);
    handler.clear();
    expect(queryOptions.toString()).toEqual('');
  });

  it('test array like filter', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    const handler = queryOptions.option(QueryOptionNames.filter, "foo eq 1");
    expect(queryOptions.toString()).toEqual('$filter=foo eq 1');
    handler.push("bar ne 2");
    expect(queryOptions.toString()).toEqual('$filter=foo eq 1 and bar ne 2');
    handler.remove("foo eq 1");
    expect(queryOptions.toString()).toEqual('$filter=bar ne 2');
    expect(handler.at(0)).toEqual('bar ne 2');
  });

  it('test hashmap like filter', () => {
    const queryOptions: ODataQueryOptions = new ODataQueryOptions();
    const handler = queryOptions.option(QueryOptionNames.filter, {foo: 1});
    expect(queryOptions.toString()).toEqual('$filter=foo eq 1');
    handler.set("bar", {ne: 2});
    expect(queryOptions.toString()).toEqual('$filter=foo eq 1 and bar ne 2');
    handler.unset("foo");
    expect(queryOptions.toString()).toEqual('$filter=bar ne 2');
    expect(handler.get('bar')).toEqual({ne: 2});
    expect(handler.has('foo')).toEqual(false);
    handler.set("bar.ne", 4);
    expect(queryOptions.toString()).toEqual('$filter=bar ne 4');
    handler.unset("bar.ne");
    handler.set("bar.gt", 4);
    expect(queryOptions.toString()).toEqual('$filter=bar gt 4');
    handler.unset("bar.gt");
    expect(queryOptions.toString()).toEqual('');
    handler.assign({foo: 1, bar: 2, fooBar: { lt: 4 }});
    expect(queryOptions.toString()).toEqual('$filter=bar eq 2 and foo eq 1 and fooBar lt 4');
  });
});
