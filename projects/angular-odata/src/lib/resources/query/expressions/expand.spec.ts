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

  describe('nested condition', () => {
    describe('as factory function', () => {
      it('field', () => {
        const compare1 = ExpandExpression.expand<Person>(({ s, e }) =>
          e().field(s.Car, (f) => {
            f.expand<Car>(({ e, s }) => e().field(s.Model));
            f.skip(1);
            f.filter<Car>(({ e, s }) => e().eq(s.Year, 2000));
          })
        );

        expect(compare1.render()).toBe(
          'Car($expand=Model;$filter=Year eq 2000;$skip=1)'
        );
      });

      it('navigation', () => {
        const compare1 = ExpandExpression.expand<Person>(({ s, e }) =>
          e().field(s.Car?.Model, (f) => {
            f.filter<Model>(({ e, s }) => e().in(s.Name, ['BMW', 'Audi']));
            f.skip(1);
            f.top(1);
          })
        );

        expect(compare1.render()).toBe(
          "Car/Model($filter=Name in ('BMW','Audi');$skip=1;$top=1)"
        );
      });
    });
  });
});
