import { TestBed } from '@angular/core/testing';
import { Enums } from './enums';

describe('Enums', () => {
  enum EnumTypes {
    One = 1,
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
    Seven = 7,
    Eight = 8,
    Nine = 9,
    Ten = 10,
  }

  enum EnumFlags {
    Mask0 = 1 << 0,
    Mask1 = 1 << 1,
    Mask2 = 1 << 2,
    Mask3 = 1 << 3,
    Mask4 = 1 << 4,
    Mask5 = 1 << 5,
    Mask6 = 1 << 6,
    Mask7 = 1 << 7,
    Mask8 = 1 << 8,
    Mask9 = 1 << 9,
  }

  it('should return al names for type enum', () => {
    expect(Enums.names(EnumTypes)).toEqual([
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
      'Six',
      'Seven',
      'Eight',
      'Nine',
      'Ten',
    ]);
  });

  it('should return all names for flag enum', () => {
    expect(Enums.names(EnumFlags)).toEqual([
      'Mask0',
      'Mask1',
      'Mask2',
      'Mask3',
      'Mask4',
      'Mask5',
      'Mask6',
      'Mask7',
      'Mask8',
      'Mask9',
    ]);
  });

  it('should return all values for type enum', () => {
    expect(Enums.values(EnumTypes)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('should return all values for flag enum', () => {
    expect(Enums.values(EnumFlags)).toEqual([
      1, // Mask0
      2, // Mask1
      4, // Mask2
      8, // Mask3
      16, // Mask4
      32, // Mask5
      64, // Mask6
      128, // Mask7
      256, // Mask8
      512, // Mask9
    ]);
  });

  it('should return value for type enum', () => {
    expect(Enums.toValue(EnumTypes, EnumTypes[EnumTypes.Four])).toEqual(4);
    expect(Enums.toValue(EnumTypes, 'Five')).toEqual(5);
  });

  it('should return name for type enum', () => {
    expect(Enums.toName(EnumTypes, EnumTypes[EnumTypes.Four])).toEqual('Four');
    expect(Enums.toName(EnumTypes, 'Five')).toEqual('Five');
    expect(Enums.toName(EnumTypes, 8)).toEqual('Eight');
  });

  it('should return all values for flag enum', () => {
    expect(Enums.toValues(EnumFlags, EnumFlags[EnumFlags.Mask4])).toEqual([16]);
    expect(
      Enums.toValues(EnumFlags, EnumFlags.Mask3 | EnumFlags.Mask6)
    ).toEqual([8, 64]);
    expect(Enums.toValues(EnumFlags, 'Mask1, Mask2, Mask3')).toEqual([2, 4, 8]);
    expect(Enums.toValues(EnumFlags, ['Mask1', 'Mask2', 'Mask3'])).toEqual([
      2, 4, 8,
    ]);
    expect(
      Enums.toValues(
        EnumFlags,
        EnumFlags.Mask3 | EnumFlags.Mask7 | EnumFlags.Mask9
      )
    ).toEqual([8, 128, 512]);
  });

  it('should return all names for flag enum', () => {
    expect(Enums.toNames(EnumFlags, EnumFlags[EnumFlags.Mask4])).toEqual([
      'Mask4',
    ]);
    expect(Enums.toNames(EnumFlags, EnumFlags.Mask3 | EnumFlags.Mask6)).toEqual(
      ['Mask3', 'Mask6']
    );
    expect(Enums.toNames(EnumFlags, 'Mask1, Mask2, Mask3')).toEqual([
      'Mask1',
      'Mask2',
      'Mask3',
    ]);
    expect(Enums.toNames(EnumFlags, ['Mask1', 'Mask2', 'Mask3'])).toEqual([
      'Mask1',
      'Mask2',
      'Mask3',
    ]);
    expect(
      Enums.toNames(
        EnumFlags,
        EnumFlags.Mask3 | EnumFlags.Mask7 | EnumFlags.Mask9
      )
    ).toEqual(['Mask3', 'Mask7', 'Mask9']);
  });

  it('should return NaN type enums for wrong input', () => {
    expect(Enums.toValue(EnumTypes, 'Mask32')).toBeNaN();
    expect(Enums.toValue(EnumTypes, 12)).toBeNaN();
  });

  it('should return empty array of values on flag enums for wrong input', () => {
    expect(Enums.toValues(EnumFlags, 'Mask32, Mask2, Mask10')).toEqual([]);
    expect(Enums.toValues(EnumFlags, ['Mask1', 3, 'Mask3'])).toEqual([]);
  });

  it('should return empty array of names on flag enums for wrong input', () => {
    expect(Enums.toValues(EnumFlags, 'Mask32, Mask2, Mask10')).toEqual([]);
    expect(Enums.toValues(EnumFlags, ['Mask1', 3, 'Mask3'])).toEqual([]);
  });
});
