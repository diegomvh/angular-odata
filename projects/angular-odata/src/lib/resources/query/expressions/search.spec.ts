import { SearchExpression } from './search';

describe('OData search builder', () => {
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
      it('term', () => {
        const compare1 = SearchExpression.search<Person>(({ e }) =>
          e().term('John')
        );

        expect(compare1.render()).toBe('John');
      });
    });

    describe('combination e().and(...).or(...)', () => {
      it('and,or', () => {
        const compare = SearchExpression.search<Person>(({ e }) =>
          e().term('John').and(e().term('Lennon')).or(e().term('Beatles'))
        );

        expect(compare.render()).toBe('(John AND Lennon) OR Beatles');
      });
    });
  });
});
