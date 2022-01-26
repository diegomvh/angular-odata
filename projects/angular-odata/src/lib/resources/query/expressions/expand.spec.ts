import { ExpandExpression } from './expand';
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
      it('field', () => {
        const compare1 = ExpandExpression.expand<Person>(({ s, e }) =>
          e().field(s.Car)
        );

        expect(compare1.render()).toBe('Car');
      });

      it('navigation', () => {
        const compare1 = ExpandExpression.expand<Person>(({ s, e }) =>
          e().field(s.Car?.Model)
        );

        expect(compare1.render()).toBe('Car/Model');
      });
    });
  });
});
