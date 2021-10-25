import { Expression } from './expressions';
import { StringFunctions } from './syntax';

describe('OData filter builder', () => {
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
    EditedOn?: boolean;
    CreatedOn?: boolean;
    Car?: Car;
  }

  const f = Expression.f;
  const and = Expression.and;
  const or = Expression.or;
  const not = Expression.not;

  describe('base condition', () => {
    describe('as factory function', () => {
      it('and', () => {
        const compare1 = and<Person>().eq('Id', 1).ne('Car', 3);

        expect(compare1.render()).toBe('Id eq 1 and Car ne 3');
      });

      it('or', () => {
        const compare1 = or<Person>().eq('Id', 1).ne('Car', 3);

        expect(compare1.render()).toBe('Id eq 1 or Car ne 3');
      });
    });

    describe('value types', () => {
      it('string', () => {
        const filter = f<Person>().eq('Name', 'test');

        expect(filter.render()).toBe("Name eq 'test'");
      });

      it('number', () => {
        const filter = f<Person>().eq('Age', 200.55);

        expect(filter.render()).toBe('Age eq 200.55');
      });

      it('boolean', () => {
        const filter = f<Person>().eq('IsCorrect', true);

        expect(filter.render()).toBe('IsCorrect eq true');
      });

      it('null', () => {
        const filter = f<Person>().eq('EditedOn', null);

        expect(filter.render()).toBe('EditedOn eq null');
      });

      it('Date', () => {
        const date = '1995-05-22T21:00:00.000Z';
        const filter = f<Person>().gt('CreatedOn', new Date(date));

        expect(filter.render()).toBe(`CreatedOn gt ${date}`);
      });
    });

    describe('navigate', () => {
      const compare1 = and<Person>().eq(
        (x) =>
          x.navigation<Car>('Car', (x) => x.navigation<Model>('Model', 'Id')),
        1
      );

      expect(compare1.render()).toBe('Car/Model/Id eq 1');
    });

    describe('logical operators', () => {
      const comparators = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];
      const functions = ['contains', 'startsWith', 'endsWith'];

      describe('simple comparision', () => {
        comparators.forEach((operator) => {
          it(operator, () => {
            const compareNumber = (f<any>() as any)[operator]('Id', 1);

            const compareString = (f<any>() as any)[operator](
              'CompanyName',
              'Google'
            );

            // skip value normalisation
            const compareString1 = (f<any>() as any)[operator](
              'CompanyName',
              'OtherCompanyName',
              false
            );

            expect(compareNumber.render()).toBe(`Id ${operator} 1`);

            expect(compareString.render()).toBe(
              `CompanyName ${operator} 'Google'`
            );

            expect(compareString1.render()).toBe(
              `CompanyName ${operator} OtherCompanyName`
            );
          });
        });

        describe('simple comparision functions', () => {
          functions.forEach((func) => {
            it(func, () => {
              const compareNumber = (f<any>() as any)[func]('Name', 'a');

              expect(compareNumber.render()).toBe(
                `${func.toLowerCase()}(Name, 'a')`
              );
            });
          });
        });
      });
    });

    describe('multiple compare', () => {
      describe('base condition f.or().eq(...)', () => {
        it('and', () => {
          const compare = f<any>()
            .eq('Id', 1)
            .ne('Type/Id', 3)
            .startsWith('Name', 'a');

          expect(compare.render()).toBe(
            "Id eq 1 and Type/Id ne 3 and startswith(Name, 'a')"
          );
        });

        it('or', () => {
          const compare = or<any>()
            .eq('Id', 1)
            .ne('Type/Id', 3)
            .endsWith('Name', 'a');

          expect(compare.render()).toBe(
            "Id eq 1 or Type/Id ne 3 or endswith(Name, 'a')"
          );
        });
      });

      describe('combination f().and(f().eq(...))', () => {
        it('and', () => {
          const compare = or<any>()
            .and(f<any>().eq('Id', 1))
            .and(f<any>().ne('Type/Id', 3))
            .and(f<any>().contains('Name', 'a'));

          expect(compare.render()).toBe(
            "Id eq 1 and Type/Id ne 3 and contains(Name, 'a')"
          );
        });

        it('or', () => {
          const compare = f<any>()
            .or(f<any>().eq('Id', 1))
            .or(f<any>().ne('Type/Id', 3))
            .or(f<any>().contains('Name', 'a'));

          expect(compare.render()).toBe(
            "Id eq 1 or Type/Id ne 3 or contains(Name, 'a')"
          );
        });

        it('not', () => {
          const compare = f<any>()
            .not(f<any>().eq('Id', 1))
            .not(f<any>().ne('Type/Id', 3))
            .not(f<any>().contains('Name', 'a'));

          expect(compare.render()).toBe(
            "not (Id eq 1) and not (Type/Id ne 3) and not (contains(Name, 'a'))"
          );
        });
      });

      describe('canonical functions', () => {
        it('length', () => {
          const func = f<any>().eq((x) => x.length('CompanyName'), 19);

          expect(func.render()).toBe('length(CompanyName) eq 19');
        });

        it('toTower', () => {
          const func = f<any>().eq(
            (x) => x.toLower('CompanyName'),
            'alfreds futterkiste'
          );

          expect(func.render()).toBe(
            "tolower(CompanyName) eq 'alfreds futterkiste'"
          );
        });

        it('toUpper', () => {
          const func = f<any>().eq(
            (x) => x.toUpper('CompanyName'),
            'ALFREDS FUTTERKISTE'
          );

          expect(func.render()).toBe(
            "toupper(CompanyName) eq 'ALFREDS FUTTERKISTE'"
          );
        });

        it('trim', () => {
          const func = f<any>().eq(
            (x) => x.trim('CompanyName'),
            'CompanyName',
            false
          );

          expect(func.render()).toBe('trim(CompanyName) eq CompanyName');
        });

        it('indexOf', () => {
          const func1 = f<any>().eq(
            (x) => x.indexOf('CompanyName', 'lfreds'),
            1
          );
          const expectedString = "indexof(CompanyName, 'lfreds') eq 1";

          expect(func1.render()).toBe(expectedString);
        });

        it('substring', () => {
          const func1 = f<any>().eq(
            (x) => x.subString('CompanyName', 1),
            'lfreds Futterkiste'
          );
          const expectedString1 =
            "substring(CompanyName, 1) eq 'lfreds Futterkiste'";

          const func3 = f<any>().eq(
            (x) => x.subString('CompanyName', 1, 2),
            'lf'
          );
          const expectedString2 = "substring(CompanyName, 1, 2) eq 'lf'";

          expect(func1.render()).toBe(expectedString1);
          expect(func3.render()).toBe(expectedString2);
        });

        // * // substring(CompanyName, 1) eq 'lfreds Futterkiste'
        // * f().eq(f.functions.substring('CompanyName', 1), 'lfreds Futterkiste');
        // * f().eq(x => x.substring('CompanyName', 1), 'lfreds Futterkiste');

        it('concat', () => {
          const func = f<any>().eq(
            (x) =>
              x.concat(
                ((y: any) => y.concat('City', ', ')) as any,
                'Country',
                false
              ),
            'Berlin, Germany'
          );

          expect(func.render()).toBe(
            "concat(concat(City, ', '), Country) eq 'Berlin, Germany'"
          );
        });
      });
    });
  });
});
