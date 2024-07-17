import { ExpandExpression } from './expand';

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
        const compare1 = ExpandExpression.factory<Person>(({ e, t }) =>
          e().field(t.Car),
        );

        expect(compare1.render()).toBe('Car');
      });

      it('navigation', () => {
        const compare1 = ExpandExpression.factory<Person>(({ e, t }) =>
          e().field(t.Car?.Model),
        );

        expect(compare1.render()).toBe('Car/Model');
      });
    });
  });

  describe('nested condition', () => {
    describe('as factory function', () => {
      it('field', () => {
        const compare1 = ExpandExpression.factory<Person>(({ e, t }) =>
          e().field(t.Car, (f) => {
            f.expand(({ e, t }) => e().field(t.Model));
            f.skip(1);
            f.filter(({ e, t }) => e().eq(t.Year, 2000));
          }),
        );

        expect(compare1.render()).toBe(
          'Car($expand=Model;$filter=Year eq 2000;$skip=1)',
        );
      });

      it('navigation', () => {
        const compare1 = ExpandExpression.factory<Person>(({ e, t }) =>
          e().field(t.Car.Model!, (f) => {
            f.filter(({ e, t }) => e().in(t.Name, ['BMW', 'Audi']));
            f.skip(1);
            f.top(1);
          }),
        );

        expect(compare1.render()).toBe(
          "Car/Model($filter=Name in ('BMW','Audi');$skip=1;$top=1)",
        );
      });
    });
  });
});
