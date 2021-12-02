import { Expression } from './expressions';
import { Field } from './syntax';

describe('OData filter builder', () => {
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
    EditedOn?: boolean;
    CreatedOn?: boolean;
    Car?: Car;
    Pets?: Pet[];
  }

  describe('base condition', () => {
    describe('as factory function', () => {
      it('and', () => {
        const compare1 = Expression.filter<Person>(({ e }) =>
          e('and').eq('Id', 1).ne('Car', 3)
        );

        expect(compare1.render()).toBe('Id eq 1 and Car ne 3');
      });

      it('or', () => {
        const compare1 = Expression.filter<Person>(({ e }) =>
          e('or').eq('Id', 1).ne('Car', 3)
        );

        expect(compare1.render()).toBe('Id eq 1 or Car ne 3');
      });
    });

    describe('value types', () => {
      it('string', () => {
        const filter = e<Person>().eq('Name', 'test');

        expect(filter.render()).toBe("Name eq 'test'");
      });

      it('number', () => {
        const filter = e<Person>().eq('Age', 200.55);

        expect(filter.render()).toBe('Age eq 200.55');
      });

      it('boolean', () => {
        const filter = e<Person>().eq('IsCorrect', true);

        expect(filter.render()).toBe('IsCorrect eq true');
      });

      it('null', () => {
        const filter = e<Person>().eq('EditedOn', null);

        expect(filter.render()).toBe('EditedOn eq null');
      });

      it('Date', () => {
        const date = '1995-05-22T21:00:00.000Z';
        const filter = e<Person>().gt('CreatedOn', new Date(date));

        expect(filter.render()).toBe(`CreatedOn gt ${date}`);
      });
    });

    describe('navigate main', () => {
      it('navigate', () => {
        const compare1 = e<Person>('and').eq(s<Person>().Car!.Model!.Id, 1);
        expect(compare1.render()).toBe('Car/Model/Id eq 1');
      });

      it('combination navigate', () => {
        const compare1 = e<Person>('and')
          .eq(s<Person>().Car!.Model!.Id, 1)
          .ne('Id', 1)
          .or(e<Person>().endsWith(s<Person>().Name, 'John'));
        expect(compare1.render()).toBe(
          "(Car/Model/Id eq 1 and Id ne 1) or endswith(Name, 'John')"
        );
      });

      it('combination and.or()', () => {
        const compare1 = e<Person>('and')
          .eq(s<Person>().Car!.Model!.Id, 1)
          .or(e<Person>().endsWith(s<Person>().Name, 'John'));
        expect(compare1.render()).toBe(
          "Car/Model/Id eq 1 or endswith(Name, 'John')"
        );
      });
    });

    describe('lambdas basics', () => {
      it('any', () => {
        const compare1 = e<Person>('and').any<Pet>('Pets', (x) =>
          x.eq('Age', 1)
        );
        expect(compare1.render()).toBe('Pets/any(pets:pets/Age eq 1)');
      });

      it('all', () => {
        const compare1 = e<Person>('and').all<Pet>('Pets', (x) =>
          x.ne('Age', 1)
        );
        expect(compare1.render()).toBe('Pets/all(pets:pets/Age ne 1)');
      });
    });

    describe('logical operators', () => {
      const comparators = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];
      const functions = ['contains', 'startsWith', 'endsWith'];

      it('in', () => {
        const compare1 = e<Person>().in('Age', [1, 2, '3']);
        expect(compare1.render()).toBe("Age in (1,2,'3')");
      });

      describe('simple comparision', () => {
        comparators.forEach((operator) => {
          it(operator, () => {
            const compareNumber = (e<any>() as any)[operator]('Id', 1);

            const compareString = (e<any>() as any)[operator](
              'CompanyName',
              'Google'
            );

            // skip value normalisation
            const compareString1 = (e<any>() as any)[operator](
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
              const compareNumber = (e<any>() as any)[func]('Name', 'a');

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
          const compare = e<any>()
            .eq('Id', 1)
            .ne('Type/Id', 3)
            .startsWith('Name', 'a');

          expect(compare.render()).toBe(
            "Id eq 1 and Type/Id ne 3 and startswith(Name, 'a')"
          );
        });

        it('or', () => {
          const compare = e<any>('or')
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
          const compare = e<any>('or')
            .and(e<any>().eq('Id', 1))
            .and(e<any>().ne('Type/Id', 3))
            .and(e<any>().contains('Name', 'a'));

          expect(compare.render()).toBe(
            "Id eq 1 and Type/Id ne 3 and contains(Name, 'a')"
          );
        });

        it('or', () => {
          const compare = e<any>()
            .or(e<any>().eq('Id', 1))
            .or(e<any>().ne('Type/Id', 3))
            .or(e<any>().contains('Name', 'a'));

          expect(compare.render()).toBe(
            "Id eq 1 or Type/Id ne 3 or contains(Name, 'a')"
          );
        });

        it('not', () => {
          const compare = e<any>()
            .not(e<any>().eq('Id', 1))
            .not(e<any>().ne('Type/Id', 3))
            .not(e<any>().contains('Name', 'a'));

          expect(compare.render()).toBe(
            "not (Id eq 1) and not (Type/Id ne 3) and not (contains(Name, 'a'))"
          );
        });
      });

      describe('canonical functions', () => {
        it('startsWith', () => {
          const func = e<any>().startsWith('CompanyName', '/3/');

          expect(func.render()).toBe("startswith(CompanyName, '/3/')");
        });

        it('length', () => {
          const s = Field.factory<Person>();
          const func = e<any>().eq(f<Person>().length(s.Car!.Year), 19);

          expect(func.render()).toBe('length(Car/Year) eq 19');
        });

        it('toTower', () => {
          const func = e<any>().eq(
            f<any>().toLower('CompanyName'),
            'alfreds futterkiste'
          );

          expect(func.render()).toBe(
            "tolower(CompanyName) eq 'alfreds futterkiste'"
          );
        });

        it('toUpper', () => {
          const func = e<any>().eq(
            f<any>().toUpper('CompanyName'),
            'ALFREDS FUTTERKISTE'
          );

          expect(func.render()).toBe(
            "toupper(CompanyName) eq 'ALFREDS FUTTERKISTE'"
          );
        });

        it('trim', () => {
          const func = e<any>().eq(
            f<any>().trim('CompanyName'),
            'CompanyName',
            false
          );

          expect(func.render()).toBe('trim(CompanyName) eq CompanyName');
        });

        it('indexOf', () => {
          const func1 = e<any>().eq(
            f<any>().indexOf('CompanyName', 'lfreds'),
            1
          );
          const expectedString = "indexof(CompanyName, 'lfreds') eq 1";

          expect(func1.render()).toBe(expectedString);
        });

        it('substring', () => {
          const func1 = e<any>().eq(
            f<any>().subString('CompanyName', 1),
            'lfreds Futterkiste'
          );
          const expectedString1 =
            "substring(CompanyName, 1) eq 'lfreds Futterkiste'";

          const func3 = e<any>().eq(
            f<any>().subString('CompanyName', 1, 2),
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
          const func = e<any>().eq(
            f<any>().concat(f<any>().concat('City', ', '), 'Country', false),
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
