import { Expand } from './expand';
import { QueryOptions } from './query-options';

describe('Expand', () => {
  it('test toString', () => {
    let entitySet: string;
    expect(() => new Expand(entitySet)).toThrowError('entitySet cannot be undefined');
    //
    entitySet = null;
    expect(() => new Expand(entitySet)).toThrowError('entitySet cannot be null');
    //
    entitySet = 'entitySet';
    let expand: Expand = new Expand(entitySet);
    expect(expand.toString()).toEqual('entitySet');
    //
    expand = new Expand(entitySet).select(['property']).filter('property eq value');
    expect(expand.toString()).toEqual('entitySet($select=property;$filter=' + encodeURIComponent('property eq value)'));
  });
});
