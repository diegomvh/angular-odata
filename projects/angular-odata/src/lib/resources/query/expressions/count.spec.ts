import { CountExpression } from './count';

describe('OData orderBy builder', () => {
  interface Pet {
    Id?: number;
    Name?: string;
    Age?: number;
    Person?: Person;
  }

  interface Model {
    Id?: number;
    Name?: string;
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
    EditedOn?: boolean;
    CreatedOn?: boolean;
    Car?: Car;
    Pets?: Pet[];
  }

  describe('base condition', () => {
    describe('as factory function', () => {
      it('count', () => {
        const compare1 = CountExpression.count<Person>(({ e, t }) =>
          e().field(t.Pets)
        );

        expect(compare1.render()).toBe('Pets/$count');
      });

      it('count filter', () => {
        const compare1 = CountExpression.count<Person>(({ e, t }) =>
          e().field(t.Pets, ({ f }) => f.filter(({ e, t }) => e().gt(t.Age, 3)))
        );

        expect(compare1.render()).toBe('Pets/$count($filter=Age gt 3)');
      });
    });
  });
});
