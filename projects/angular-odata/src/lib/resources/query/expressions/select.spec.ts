import { SearchExpression } from './search';
import { SelectExpression } from './select';

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
      it('select', () => {
        const compare1 = SelectExpression.select<Person>(({ t, e }) =>
          e().field(t.Car).field(t.Name)
        );

        expect(compare1.render()).toBe('Car,Name');
      });
    });

    describe('navigation e().field(...)', () => {
      it('navigate', () => {
        const compare = SelectExpression.select<Person>(({ t, e }) =>
          e().field(t.Car?.Model?.Name).field(t.Age)
        );

        expect(compare.render()).toBe('Car/Model/Name,Age');
      });
    });
  });
});
