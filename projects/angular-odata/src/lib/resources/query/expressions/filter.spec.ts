import { FilterExpression } from './filter';
import { FieldFactory } from './syntax';

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
    describe('normalize', () => {
      it('all', () => {
        const compare1 = FilterExpression.factory<Person>(({ e }) =>
          e().eq('string', 'string', 'all').ne('strong', 'string', 'all'),
        );

        expect(compare1.render()).toBe(
          "'string' eq 'string' and 'strong' ne 'string'",
        );
      });

      it('left', () => {
        const compare1 = FilterExpression.factory<Person>(({ e }) =>
          e().eq(1, 'Id', 'left').ne(3, 'Car', 'left'),
        );

        expect(compare1.render()).toBe('1 eq Id and 3 ne Car');
      });

      it('right', () => {
        const compare1 = FilterExpression.factory<Person>(({ e }) =>
          e().eq('Id', 1, 'right').ne('Car', 3, 'right'),
        );

        expect(compare1.render()).toBe('Id eq 1 and Car ne 3');
      });

      it('none', () => {
        const compare1 = FilterExpression.factory<Person>(({ e }) =>
          e().eq('Id', 'FieldId', 'none').ne('Car', 'FieldCar', 'none'),
        );

        expect(compare1.render()).toBe('Id eq FieldId and Car ne FieldCar');
      });
    });
    describe('as factory function', () => {
      it('and', () => {
        const compare1 = FilterExpression.factory<Person>(({ e }) =>
          e('and').eq('Id', 1).ne('Car', 3),
        );

        expect(compare1.render()).toBe('Id eq 1 and Car ne 3');
      });

      it('or', () => {
        const compare1 = FilterExpression.factory<Person>(({ e }) =>
          e('or').eq('Id', 1).ne('Car', 3),
        );

        expect(compare1.render()).toBe('Id eq 1 or Car ne 3');
      });
    });

    describe('value types', () => {
      it('string', () => {
        const filter = FilterExpression.factory<Person>(({ e }) =>
          e().eq('Name', 'test'),
        );

        expect(filter.render()).toBe("Name eq 'test'");
      });

      it('number', () => {
        const filter = FilterExpression.factory<Person>(({ e }) =>
          e().eq('Age', 200.55),
        );

        expect(filter.render()).toBe('Age eq 200.55');
      });

      it('boolean', () => {
        const filter = FilterExpression.factory<Person>(({ e }) =>
          e().eq('IsCorrect', true),
        );

        expect(filter.render()).toBe('IsCorrect eq true');
      });

      it('null', () => {
        const filter = FilterExpression.factory<Person>(({ e }) =>
          e().eq('EditedOn', null),
        );
        expect(filter.render()).toBe('EditedOn eq null');
      });

      it('Date', () => {
        const date = '1995-05-22T21:00:00.000Z';
        const filter = FilterExpression.factory<Person>(({ e }) =>
          e().gt('CreatedOn', new Date(date)),
        );

        expect(filter.render()).toBe(`CreatedOn gt ${date}`);
      });
    });

    describe('navigate main', () => {
      it('navigate', () => {
        const compare1 = FilterExpression.factory<Person>(({ e, t }) =>
          e('and').eq(t.Car!.Model!.Id, 1),
        );
        expect(compare1.render()).toBe('Car/Model/Id eq 1');
      });

      it('combination navigate', () => {
        const compare1 = FilterExpression.factory<Person>(({ e, t }) =>
          e('and')
            .eq(t.Car!.Model!.Id, 1)
            .ne('Id', 1)
            .or(e().endsWith(t.Name, 'John')),
        );
        expect(compare1.render()).toBe(
          "(Car/Model/Id eq 1 and Id ne 1) or endswith(Name, 'John')",
        );
      });

      it('combination and.or()', () => {
        const compare1 = FilterExpression.factory<Person>(({ e, t }) =>
          e('and').eq(t.Car!.Model!.Id, 1).or(e().endsWith(t.Name, 'John')),
        );
        expect(compare1.render()).toBe(
          "Car/Model/Id eq 1 or endswith(Name, 'John')",
        );
      });
    });

    describe('lambdas basics', () => {
      it('any', () => {
        const compare1 = FilterExpression.factory<Person>(({ e, t }) =>
          e('and').any<Pet>(t.Pets!, ({ e, t }) => e().eq(t.Age, 1)),
        );
        expect(compare1.render()).toBe('Pets/any(p:p/Age eq 1)');
      });

      it('all', () => {
        const compare1 = FilterExpression.factory<Person>(({ e, t }) =>
          e('and').all<Pet>(t.Pets!, ({ e, t }) => e().ne(t.Age, 1)),
        );
        expect(compare1.render()).toBe('Pets/all(p:p/Age ne 1)');
      });
    });

    describe('logical operators', () => {
      const comparators = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];
      const functions = ['contains', 'startsWith', 'endsWith'];

      it('in', () => {
        const compare1 = FilterExpression.factory<Person>(({ e }) =>
          e().in('Age', [1, 2, '3']),
        );
        expect(compare1.render()).toBe("Age in (1,2,'3')");
      });

      describe('simple comparision', () => {
        comparators.forEach((operator) => {
          it(operator, () => {
            const compareNumber = FilterExpression.factory(({ e }) =>
              (e() as any)[operator]('Id', 1),
            );

            const compareString = FilterExpression.factory(({ e }) =>
              (e() as any)[operator]('CompanyName', 'Google'),
            );

            // skip value normalisation
            const compareString1 = FilterExpression.factory(({ e }) =>
              (e() as any)[operator]('CompanyName', 'OtherCompanyName', false),
            );

            expect(compareNumber.render()).toBe(`Id ${operator} 1`);

            expect(compareString.render()).toBe(
              `CompanyName ${operator} 'Google'`,
            );

            expect(compareString1.render()).toBe(
              `CompanyName ${operator} OtherCompanyName`,
            );
          });
        });

        describe('simple comparision functions', () => {
          functions.forEach((func) => {
            it(func, () => {
              const compareNumber = FilterExpression.factory(({ e }) =>
                (e() as any)[func]('Name', 'a'),
              );

              expect(compareNumber.render()).toBe(
                `${func.toLowerCase()}(Name, 'a')`,
              );
            });
          });
        });
      });
    });

    describe('multiple compare', () => {
      describe('base condition f.or().eq(...)', () => {
        it('and', () => {
          const compare = FilterExpression.factory<any>(({ e }) =>
            e().eq('Id', 1).ne('Type/Id', 3).startsWith('Name', 'a'),
          );

          expect(compare.render()).toBe(
            "Id eq 1 and Type/Id ne 3 and startswith(Name, 'a')",
          );
        });

        it('or', () => {
          const compare = FilterExpression.factory<any>(({ e }) =>
            e('or').eq('Id', 1).ne('Type/Id', 3).endsWith('Name', 'a'),
          );

          expect(compare.render()).toBe(
            "Id eq 1 or Type/Id ne 3 or endswith(Name, 'a')",
          );
        });
      });

      describe('combination f().and(f().eq(...))', () => {
        it('and', () => {
          const compare = FilterExpression.factory<any>(({ e }) =>
            e('or')
              .and(e().eq('Id', 1))
              .and(e().ne('Type/Id', 3))
              .and(e().contains('Name', 'a')),
          );

          expect(compare.render()).toBe(
            "Id eq 1 and Type/Id ne 3 and contains(Name, 'a')",
          );
        });

        it('or', () => {
          const compare = FilterExpression.factory<any>(({ e }) =>
            e()
              .or(e().eq('Id', 1))
              .or(e().ne('Type/Id', 3))
              .or(e().contains('Name', 'a')),
          );

          expect(compare.render()).toBe(
            "Id eq 1 or Type/Id ne 3 or contains(Name, 'a')",
          );
        });

        it('not', () => {
          const compare = FilterExpression.factory<any>(({ e }) =>
            e()
              .not(e().eq('Id', 1))
              .not(e().ne('Type/Id', 3))
              .not(e().contains('Name', 'a')),
          );

          expect(compare.render()).toBe(
            "not (Id eq 1) and not (Type/Id ne 3) and not (contains(Name, 'a'))",
          );
        });
      });

      describe('canonical functions', () => {
        it('startsWith', () => {
          const func = FilterExpression.factory<any>(({ e }) =>
            e().startsWith('CompanyName', '/3/'),
          );

          expect(func.render()).toBe("startswith(CompanyName, '/3/')");
        });

        it('length', () => {
          const t = FieldFactory<Person>();
          const func = FilterExpression.factory<any>(({ e, f }) =>
            e().eq(f.length(t.Car!.Year), 19),
          );

          expect(func.render()).toBe('length(Car/Year) eq 19');
        });

        it('toTower', () => {
          const func = FilterExpression.factory<any>(({ e, f }) =>
            e().eq(f.toLower('CompanyName'), 'alfreds futterkiste'),
          );

          expect(func.render()).toBe(
            "tolower(CompanyName) eq 'alfreds futterkiste'",
          );
        });

        it('toUpper', () => {
          const func = FilterExpression.factory<any>(({ e, f }) =>
            e().eq(f.toUpper('CompanyName'), 'ALFREDS FUTTERKISTE'),
          );

          expect(func.render()).toBe(
            "toupper(CompanyName) eq 'ALFREDS FUTTERKISTE'",
          );
        });

        it('trim', () => {
          const func = FilterExpression.factory<any>(({ e, f }) =>
            e().eq(f.trim('CompanyName'), 'CompanyName', 'none'),
          );

          expect(func.render()).toBe('trim(CompanyName) eq CompanyName');
        });

        it('indexOf', () => {
          const func1 = FilterExpression.factory<any>(({ e, f }) =>
            e().eq(f.indexOf('CompanyName', 'lfreds'), 1),
          );
          const expectedString = "indexof(CompanyName, 'lfreds') eq 1";

          expect(func1.render()).toBe(expectedString);
        });

        it('substring', () => {
          const func1 = FilterExpression.factory<any>(({ e, f }) =>
            e().eq(f.subString('CompanyName', 1), 'lfreds Futterkiste'),
          );
          const expectedString1 =
            "substring(CompanyName, 1) eq 'lfreds Futterkiste'";

          const func3 = FilterExpression.factory<any>(({ e, f }) =>
            e().eq(f.subString('CompanyName', 1, 2), 'lf'),
          );
          const expectedString2 = "substring(CompanyName, 1, 2) eq 'lf'";

          expect(func1.render()).toBe(expectedString1);
          expect(func3.render()).toBe(expectedString2);
        });

        // * // substring(CompanyName, 1) eq 'lfreds Futterkiste'
        // * f().eq(f.functions.substring('CompanyName', 1), 'lfreds Futterkiste');
        // * f().eq(x => x.substring('CompanyName', 1), 'lfreds Futterkiste');

        it('concat', () => {
          const func = FilterExpression.factory<any>(({ e, f }) =>
            e().eq(
              f.concat(f.concat('City', ', '), 'Country', 'none'),
              'Berlin, Germany',
            ),
          );

          expect(func.render()).toBe(
            "concat(concat(City, ', '), Country) eq 'Berlin, Germany'",
          );
        });
      });
      describe('count expression', () => {
        it('count simple', () => {
          const func = FilterExpression.factory<Person>(({ e, t }) =>
            e().gt(e().count(t.Pets), 3),
          );
          expect(func.render()).toBe('Pets/$count gt 3');
        });

        it('count', () => {
          const func = FilterExpression.factory<Person>(({ e, t }) =>
            e().gt(
              e().count(t.Pets, ({ f }) =>
                f.filter(({ e, t }) => e().gt(t.Age, 3)),
              ),
              3,
            ),
          );
          expect(func.render()).toBe('Pets/$count($filter=Age gt 3) gt 3');
        });

        it('count operator', () => {
          const func = FilterExpression.factory<Person>(({ e, t }) =>
            e().lt(
              e().count(t.Pets, ({ f }) =>
                f.filter(({ e, t }) => e().startsWith(t.Name, 'Poly')),
              ),
              3,
            ),
          );
          expect(func.render()).toBe(
            "Pets/$count($filter=startswith(Name, 'Poly')) lt 3",
          );
        });
      });
    });
  });
});
