import { Expression } from './expressions';
import { StringFunctions } from './syntax';

describe('OData filter builder', () => {
  interface Car {
    Id?: number;
    Model?: string;
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
  });

  /*
  describe('base condition', () => {
    it('not', () => {
        .eq((x) => x.date('Edad'), 'JUAN')
        .gt((x) => x.toUpper('Nombre'), 12)
        .eq('Apellido', 'hola')
        .gt('Edad', 32)
        .or(not<Persona>(f<Persona>().eq('Apellido', 'hola')))
        .or((x) => not<Persona>(x.eq('Apellido', 'hola').gt('Edad', 32)));

      expect(compare.toString()).toBe(
        "(date(Edad) eq 'JUAN' and toupper(Nombre) gt 12 and Apellido eq 'hola' and Edad gt 32) or (not (Apellido eq 'hola')) or (not (Apellido eq 'hola' and Edad gt 32))"
      );
    });
    /*
    it('default and', () => {
      const filter = FilterBuilder.f<any>()
        .contains((x) => x.toLower('Name'), 'google')
        .ne('Type/Name', 'Search Engine')
        .and((e) => e.eq((x) => x.toUpper('Type/Name'), 'Search Engine'))
        .or((e) => e.eq('Type/Name', 'Search Engine'))
        .and((e) => e.eq('Type/Name', 'Search Engine'));

      expect(filter.toString()).toBe(
        "contains(tolower(Name), 'google') and Type/Name ne 'Search Engine' and Type/Name eq 'Search Engine'"
      );
    });

    it('and + or', () => {
      const filter = FilterBuilder.f<any>()
        .contains((x) => x.toLower('Name'), 'google')
        .ne('Type/Name', 'Search Engine')
        .or((x) => x.eq('Type/Name', 'Search Engine'));

      expect(filter.toString()).toBe(
        "(contains(tolower(Name), 'google') and Type/Name ne 'Search Engine') or Type/Name eq 'Search Engine'"
      );
    });

    it('or + and', () => {
      const filter = FilterBuilder.and<any>()
        .contains((x) => x.toLower('Name'), 'google')
        .contains((x) => x.toLower('Name'), 'yandex')
        .or((x) =>
          x.eq('Type/Name', 'Search Engine').eq('Type/Name', 'Search Engine')
        )
        .and((x) => x.eq('Type/Name', 'Search Engine'))
        .gt('Type/Rank', 1);

      expect(filter.toString()).toBe(
        "(contains(tolower(Name), 'google') or contains(tolower(Name), 'yandex')) and Type/Name eq 'Search Engine'"
      );
    });
    */
});
/*
    describe('as constructor parameter', () => {
      it('and', () => {
        const compare1 = new FilterBuilder(Condition.AND)
          .eq('Id', 1)
          .ne('Type/Id', 3);

        expect(compare1.toString()).toBe('(Id eq 1) and (Type/Id ne 3)');
      });

      it('or', () => {
        const compare1 = new FilterBuilder(Condition.OR)
          .eq('Id', 1)
          .ne('Type/Id', 3);

        expect(compare1.toString()).toBe('(Id eq 1) or (Type/Id ne 3)');
      });
    });

    describe('as factory function', () => {
      it('and', () => {
        const compareAnd = FilterBuilder.and<any>()
          .eq('Id', 1)
          .ne('Type/Id', 3);

        expect(compareAnd.toString()).toBe('(Id eq 1) and (Type/Id ne 3)');
      });

      it('or', () => {
        const compareOr = FilterBuilder.or<any>().eq('Id', 1).ne('Type/Id', 3);

        expect(compareOr.toString()).toBe('(Id eq 1) or (Type/Id ne 3)');
      });
    });
  });

  describe('value types', () => {
    it('string', () => {
      const filter = new FilterBuilder().eq('name', 'test');

      expect(filter.toString()).toBe("name eq 'test'");
    });

    it('number', () => {
      const filter = new FilterBuilder().eq('sum', 200.55);

      expect(filter.toString()).toBe('sum eq 200.55');
    });

    it('boolean', () => {
      const filter = new FilterBuilder().eq('isCorrect', true);

      expect(filter.toString()).toBe('isCorrect eq true');
    });

    it('null', () => {
      const filter = new FilterBuilder().eq('editedOn', null);

      expect(filter.toString()).toBe('editedOn eq null');
    });

    it('Date', () => {
      const date = '1995-05-22T21:00:00.000Z';
      const filter = new FilterBuilder().gt('createdOn', new Date(date));

      expect(filter.toString()).toBe(`createdOn gt ${date}`);
    });
  });

  describe('logical operators', () => {
    const comparators = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];
    const functions = ['contains', 'startsWith', 'endsWith'];

    describe('simple comparision', () => {
      comparators.forEach((operator) => {
        it(operator, () => {
          const builder = new FilterBuilder() as any;
          const compareNumber = builder[operator]('Id', 1);

          const compareString = builder[operator]('CompanyName', 'Google');

          // skip value normalisation
          const compareString1 = builder[operator](
            'CompanyName',
            'OtherCompanyName',
            false
          );

          expect(compareNumber.toString()).toBe(`Id ${operator} 1`);

          expect(compareString.toString()).toBe(
            `CompanyName ${operator} 'Google'`
          );

          expect(compareString1.toString()).toBe(
            `CompanyName ${operator} OtherCompanyName`
          );
        });
      });
    });

    describe('simple comparision functions', () => {
      functions.forEach((func) => {
        it(func, () => {
          const builder = new FilterBuilder() as any;
          const compareNumber = builder[func]('Name', 'a');

          expect(compareNumber.toString()).toBe(
            `${func.toLowerCase()}(Name, 'a')`
          );
        });
      });
    });

    describe('multiple eq/ne helpers', () => {
      it('in(field, [1,2,3])', () => {
        const compare = new FilterBuilder().in('Type/Id', [1, 2, '3']);

        expect(compare.toString()).toBe(
          "Type/Id eq 1 or Type/Id eq 2 or Type/Id eq '3'"
        );
      });

      it('in(field, [])', () => {
        const compare = new FilterBuilder().in('Type/Id', []);

        expect(compare.toString()).toBe('');
      });

      it('in(field, null)', () => {
        const compare = new FilterBuilder().in('Type/Id', null);

        expect(compare.toString()).toBe('');
      });

      it("in(field, 'otherField', false)", () => {
        const compare = new FilterBuilder().in('FullName', 'ShortName', false);

        expect(compare.toString()).toBe('FullName eq ShortName');
      });

      it('notIn(field, [1,2,3])', () => {
        const compare = new FilterBuilder().notIn('Type/Id', [1, 2, '3']);

        expect(compare.toString()).toBe(
          "not (Type/Id eq 1 or Type/Id eq 2 or Type/Id eq '3')"
        );
      });

      it('notIn(field, [])', () => {
        const compare = new FilterBuilder().notIn('Type/Id', []);

        expect(compare.toString()).toBe('');
      });

      it('notIn(field, null)', () => {
        const compare = new FilterBuilder().notIn('Type/Id', null);

        expect(compare.toString()).toBe('');
      });

      it("notIn(field, '1')", () => {
        const compare = new FilterBuilder().notIn('Type/Id', 1);

        expect(compare.toString()).toBe('not (Type/Id eq 1)');
      });
    });

    describe('multiple compare', () => {
      describe('base condition f.or().eq(...)', () => {
        it('and', () => {
          const compare = new FilterBuilder()
            .eq('Id', 1)
            .ne('Type/Id', 3)
            .startsWith('Name', 'a');

          expect(compare.toString()).toBe(
            "(Id eq 1) and (Type/Id ne 3) and (startswith(Name, 'a'))"
          );
        });

        it('or', () => {
          const compare = FilterBuilder.or()
            .eq('Id', 1)
            .ne('Type/Id', 3)
            .endsWith('Name', 'a');

          expect(compare.toString()).toBe(
            "(Id eq 1) or (Type/Id ne 3) or (endswith(Name, 'a'))"
          );
        });
      });

      describe('combination new FilterBuilder().and(new FilterBuilder().eq(...))', () => {
        it('and', () => {
          const compare = FilterBuilder.or()
            .and(new FilterBuilder().eq('Id', 1))
            .and(new FilterBuilder().ne('Type/Id', 3))
            .and(new FilterBuilder().contains('Name', 'a'));

          expect(compare.toString()).toBe(
            "(Id eq 1) and (Type/Id ne 3) and (contains(Name, 'a'))"
          );
        });
        /*

        it('or', () => {
          const compare = FilterBuilder
            .or(new FilterBuilder().eq('Id', 1))
            .or(new FilterBuilder().ne('Type/Id', 3))
            .or(new FilterBuilder().contains('Name', 'a'));

          expect(compare.toString()).toBe(
            "(Id eq 1) or (Type/Id ne 3) or (contains(Name, 'a'))"
          );
        });

        it('not', () => {
          const compare = new FilterBuilder()
            .not(new FilterBuilder().eq('Id', 1))
            .not(new FilterBuilder().ne('Type/Id', 3))
            .not(new FilterBuilder().contains('Name', 'a'));

          expect(compare.toString()).toBe(
            "(not (Id eq 1)) and (not (Type/Id ne 3)) and (not (contains(Name, 'a')))"
          );
        });
      });

      describe('lambda new FilterBuilder().and(x => x.eq(...))', () => {
        it('and', () => {
          const compare = new FilterBuilder()
            .and((x) => x.eq('Id', 1))
            .and((x) => x.ne('Type/Id', 3));

          expect(compare.toString()).toBe('(Id eq 1) and (Type/Id ne 3)');
        });

        it('or', () => {
          const compare = new FilterBuilder()
            .or((x) => x.eq('Id', 1))
            .or((x) => x.ne('Type/Id', 3));

          expect(compare.toString()).toBe('(Id eq 1) or (Type/Id ne 3)');
        });

        it('not', () => {
          const compare = new FilterBuilder()
            .not((x) => x.eq('Id', 1))
            .not((x) => x.ne('Type/Id', 3));

          expect(compare.toString()).toBe(
            '(not (Id eq 1)) and (not (Type/Id ne 3))'
          );
        });

        it('not in', () => {
          const compare = new FilterBuilder().not((x) =>
            x.in('Type/Id', [1, 2, '3'])
          );

          expect(compare.toString()).toBe(
            "not (Type/Id eq 1 or Type/Id eq 2 or Type/Id eq '3')"
          );
        });
      });
    });
  });

  describe('canonical functions', () => {
    it('length', () => {
      const func = new FilterBuilder().eq((x) => x.length('CompanyName'), 19);

      expect(func.toString()).toBe('length(CompanyName) eq 19');
    });

    it('toTower', () => {
      const func = new FilterBuilder().eq(
        (x) => x.toLower('CompanyName'),
        'alfreds futterkiste'
      );

      expect(func.toString()).toBe(
        "tolower(CompanyName) eq 'alfreds futterkiste'"
      );
    });

    it('toUpper', () => {
      const func = new FilterBuilder().eq(
        (x) => x.toUpper('CompanyName'),
        'ALFREDS FUTTERKISTE'
      );

      expect(func.toString()).toBe(
        "toupper(CompanyName) eq 'ALFREDS FUTTERKISTE'"
      );
    });

    it('trim', () => {
      const func = new FilterBuilder().eq(
        (x) => x.trim('CompanyName'),
        'CompanyName',
        false
      );

      expect(func.toString()).toBe('trim(CompanyName) eq CompanyName');
    });

    it('indexOf', () => {
      const func1 = new FilterBuilder().eq(
        (x) => x.indexOf('CompanyName', 'lfreds'),
        1
      );
      const func2 = new FilterBuilder().eq(
        canonicalFunctions.indexOf('CompanyName', 'lfreds'),
        1
      );
      const expectedString = "indexof(CompanyName, 'lfreds') eq 1";

      expect(func1.toString()).toBe(expectedString);

      expect(func2.toString()).toBe(expectedString);
    });

    it('substring', () => {
      const func1 = new FilterBuilder().eq(
        (x) => x.substring('CompanyName', 1),
        'lfreds Futterkiste'
      );
      const func2 = new FilterBuilder().eq(
        canonicalFunctions.substring('CompanyName', 1),
        'lfreds Futterkiste'
      );
      const expectedString1 =
        "substring(CompanyName, 1) eq 'lfreds Futterkiste'";

      const func3 = new FilterBuilder().eq(
        (x) => x.substring('CompanyName', 1, 2),
        'lf'
      );
      const func4 = new FilterBuilder().eq(
        canonicalFunctions.substring('CompanyName', 1, 2),
        'lf'
      );
      const expectedString2 = "substring(CompanyName, 1, 2) eq 'lf'";

      expect(func1.toString()).toBe(expectedString1);

      expect(func2.toString()).toBe(expectedString1);

      expect(func3.toString()).toBe(expectedString2);

      expect(func4.toString()).toBe(expectedString2);
    });

    // * // substring(CompanyName, 1) eq 'lfreds Futterkiste'
    // * new FilterBuilder().eq(f.functions.substring('CompanyName', 1), 'lfreds Futterkiste');
    // * new FilterBuilder().eq(x => x.substring('CompanyName', 1), 'lfreds Futterkiste');

    it('concat', () => {
      const func = new FilterBuilder().eq(
        (x) => x.concat((y) => y.concat('City', ', '), 'Country', false),
        'Berlin, Germany'
      );

      expect(func.toString()).toBe(
        "concat(concat(City, ', '), Country) eq 'Berlin, Germany'"
      );
    });
  });

  describe('combinations', () => {
    it('eq + contains + tolower', () => {
      const filter = new FilterBuilder()
        .eq('Type/Id', 2)
        .contains((y) => y.toLower('Name'), 'a');

      expect(filter.toString()).toBe(
        "(Type/Id eq 2) and (contains(tolower(Name), 'a'))"
      );
    });

    it('not + eq + concat', () => {
      const filter = new FilterBuilder().not((x) =>
        x.eq(
          (y) => y.concat((z) => z.concat('City', ', '), 'Country', false),
          'Berlin, Germany'
        )
      );

      expect(filter.toString()).toBe(
        "not (concat(concat(City, ', '), Country) eq 'Berlin, Germany')"
      );
    });

    it('and + or', () => {
      const filter = new FilterBuilder()
        .contains((x) => x.toLower('Name'), 'google')
        .ne('Type/Name', 'Search Engine')
        .or((x) => x.eq('Type/Name', 'Search Engine'));

      expect(filter.toString()).toBe(
        "((contains(tolower(Name), 'google')) and (Type/Name ne 'Search Engine')) or (Type/Name eq 'Search Engine')"
      );
    });

    it('or + and', () => {
      const filter = or()
        .contains((x) => x.toLower('Name'), 'google')
        .contains((x) => x.toLower('Name'), 'yandex')
        .and((x) => x.eq('Type/Name', 'Search Engine'));

      expect(filter.toString()).toBe(
        "((contains(tolower(Name), 'google')) or (contains(tolower(Name), 'yandex'))) and (Type/Name eq 'Search Engine')"
      );
    });
  });

  describe('fn', () => {
    it('substringof', () => {
      const filter = new FilterBuilder().fn(
        'substringof',
        'Name',
        'John',
        true,
        true
      );

      expect(filter.toString()).toBe("substringof('John', Name)");
    });

    it('substringof + toLower', () => {
      const filter = new FilterBuilder().fn(
        'substringof',
        (x) => x.toLower('Name'),
        'john',
        true,
        true
      );

      expect(filter.toString()).toBe("substringof('john', tolower(Name))");
    });
  });

  describe('helpers', () => {
    it('prototype.isEmpty', () => {
      const filter = new FilterBuilder();

      expect(filter.isEmpty()).toBe(true);

      // is empty after adding caparison with empty value
      filter.in('property', []);
      expect(filter.isEmpty()).toBe(true);

      // is not empty after comparison with not empty value
      filter.in('property', [1, 2, 3]);
      expect(filter.isEmpty()).toBe(false);
    });
  });
  */
