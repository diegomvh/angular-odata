import { Strings } from './strings';

describe('Strings', () => {
  it('should convert to title case', () => {
    expect(Strings.titleCase('hiWorld')).toEqual('Hi World');
    expect(Strings.titleCase('world')).toEqual('World');
    expect(Strings.titleCase('anitaLavaLaTina')).toEqual('Anita Lava La Tina');
    expect(Strings.titleCase('PascalCase')).toEqual('Pascal Case');
  });
});
