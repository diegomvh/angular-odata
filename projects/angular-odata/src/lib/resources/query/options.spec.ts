import { QueryOption } from '../../types';
import { ODataQueryOptions } from './options';

describe('ODataQueryOptions', () => {
  it('test select', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    queryOptions.option(QueryOption.select, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.select, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.select, []);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.select, 'value');
    expect(queryOptions.toString()).toEqual('$select=value');
    //
    queryOptions.option(QueryOption.select, ['value']);
    expect(queryOptions.toString()).toEqual('$select=value');
  });

  it('test filter', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    queryOptions.option(QueryOption.filter, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.filter, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.filter, '');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.filter, { property: 'value' });
    expect(queryOptions.toString()).toEqual("$filter=property eq 'value'");
    //
    queryOptions.option(QueryOption.filter, { property: { ne: 'value' } });
    expect(queryOptions.toString()).toEqual("$filter=property ne 'value'");
  });

  it('test expand', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    queryOptions.option(QueryOption.expand, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.expand, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.expand, '');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.expand, []);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.expand, 'value');
    expect(queryOptions.toString()).toEqual('$expand=value');
    //
    queryOptions.option(QueryOption.expand, ['value']);
    expect(queryOptions.toString()).toEqual('$expand=value');
  });

  it('test orderby', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    queryOptions.option(QueryOption.orderBy, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.orderBy, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.orderBy, '');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.orderBy, []);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.orderBy, 'value');
    expect(queryOptions.toString()).toEqual('$orderby=value');
    //
    queryOptions.option(QueryOption.orderBy, [['value', 'asc']]);
    expect(queryOptions.toString()).toEqual('$orderby=value asc');
  });

  it('test search', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    queryOptions.option(QueryOption.search, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.search, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.search, '');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.search, 'value');
    expect(queryOptions.toString()).toEqual(
      '$search=' + encodeURIComponent('value'),
    );
    //
    queryOptions.option(QueryOption.search, ['value']);
    expect(queryOptions.toString()).toEqual(
      '$search=' + encodeURIComponent('value'),
    );
    //
    queryOptions.option(QueryOption.search, 'null');
    expect(queryOptions.toString()).toEqual(
      '$search=' + encodeURIComponent('null'),
    );
  });

  it('test skip', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    queryOptions.option(QueryOption.skip, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.skip, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.skip, 0);
    expect(queryOptions.toString()).toEqual('$skip=0');
  });

  it('test top', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    queryOptions.option(QueryOption.top, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.top, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.top, 0);
    expect(queryOptions.toString()).toEqual('$top=0');
  });

  it('test format', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    queryOptions.option(QueryOption.format, undefined);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.format, null);
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.format, '');
    expect(queryOptions.toString()).toEqual('');
    //
    queryOptions.option(QueryOption.format, 'json');
    expect(queryOptions.toString()).toEqual('$format=json');
  });

  it('test toString', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    queryOptions.option(QueryOption.select, ['value']);
    queryOptions.option(QueryOption.filter, 'property eq value');
    queryOptions.option(QueryOption.expand, 'entitySet');
    queryOptions.option(QueryOption.orderBy, 'property');
    queryOptions.option(QueryOption.search, 'value');
    queryOptions.option(QueryOption.skip, 10);
    queryOptions.option(QueryOption.top, 20);
    const [, params] = queryOptions.pathAndParams();
    expect(params).toEqual({
      $select: 'value',
      $filter: 'property eq value',
      $expand: 'entitySet',
      $orderby: 'property',
      $search: 'value',
      $skip: 10,
      $top: 20,
    });
  });

  it('test isEmpty', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    expect(queryOptions.toString()).toEqual('');
  });

  it('test value top', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    const handler = queryOptions.option(QueryOption.top, 1);
    expect(queryOptions.toString()).toEqual('$top=1');
    expect(handler.value()).toEqual(1);
    handler.value(4);
    expect(queryOptions.toString()).toEqual('$top=4');
  });

  it('test clear by handler', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    const handler = queryOptions.option(QueryOption.top, 1);
    handler.clear();
    expect(queryOptions.toString()).toEqual('');
  });

  it('test array like filter', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    const handler = queryOptions.option(QueryOption.filter, 'foo eq 1');
    expect(queryOptions.toString()).toEqual('$filter=foo eq 1');
    handler.push('bar ne 2');
    expect(queryOptions.toString()).toEqual('$filter=foo eq 1 and bar ne 2');
    handler.remove('foo eq 1');
    expect(queryOptions.toString()).toEqual('$filter=bar ne 2');
    expect(handler.at(0)).toEqual('bar ne 2');
  });

  it('test hashmap like filter', () => {
    const queryOptions: ODataQueryOptions<any> = new ODataQueryOptions<any>();
    const handler = queryOptions.option(QueryOption.filter, { foo: 1 });
    expect(queryOptions.toString()).toEqual('$filter=foo eq 1');
    handler.set('bar', { ne: 2 });
    expect(queryOptions.toString()).toEqual('$filter=foo eq 1 and bar ne 2');
    handler.unset('foo');
    expect(queryOptions.toString()).toEqual('$filter=bar ne 2');
    expect(handler.get('bar')).toEqual({ ne: 2 });
    expect(handler.has('foo')).toEqual(false);
    handler.set('bar.ne', 4);
    expect(queryOptions.toString()).toEqual('$filter=bar ne 4');
    handler.unset('bar.ne');
    handler.set('bar.gt', 4);
    expect(queryOptions.toString()).toEqual('$filter=bar gt 4');
    handler.unset('bar.gt');
    expect(queryOptions.toString()).toEqual('');
    handler.assign({ foo: 1, bar: 2, fooBar: { lt: 4 } });
    expect(queryOptions.toString()).toEqual(
      '$filter=bar eq 2 and foo eq 1 and fooBar lt 4',
    );
  });
});
