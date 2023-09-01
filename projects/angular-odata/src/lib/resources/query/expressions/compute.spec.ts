import { ComputeExpression } from './compute';

describe('OData compute builder', () => {
  interface Pet {
    Id?: number;
    Name?: string;
    Age?: number;
    Person?: Person;
  }

  interface Model {
    Id?: number;
  }

  interface Car {
    Id?: number;
    Model?: Model;
    Year?: number;
  }

  interface Person {
    Id?: number;
    Name?: string;
    Age?: number;
    IsCorrect?: boolean;
    EditedOn?: Date;
    CreatedOn?: Date;
    BornOn?: Date;
    Car?: Car;
    Pets?: Pet[];
  }

  describe('base condition', () => {
    it('field', () => {
      const compare1 = ComputeExpression.compute<Person>(({ e, t }) =>
        e().field('Class', ({ f }) => f.year(t.BornOn)),
      );

      expect(compare1.render()).toBe('year(BornOn) as Class');
    });
  });
});
