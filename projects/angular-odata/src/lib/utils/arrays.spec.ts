import { Arrays } from './arrays';

describe('Arrays', () => {
  it('should convert to title case', () => {
    expect(Arrays.zip([1, 2, 3, 4, 5, 6], ['a', 'b', 'c', 'd', 'e', 'f'])).toEqual([
      [1, 'a'],
      [2, 'b'],
      [3, 'c'],
      [4, 'd'],
      [5, 'e'],
      [6, 'f'],
    ]);
  });
});
