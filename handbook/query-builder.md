# Query builder

Every resource has a `query()` method. The callback receives an `ODataQueryOptionsHandler`
with a method for each system query option. The changes are applied to the resource.

```typescript
const people = client.entitySet<Person>('People').query((q) => {
  q.select(['UserName', 'FirstName', 'LastName']);
  q.filter({ FirstName: { startswith: 'R' } });
  q.orderBy('LastName desc');
  q.top(10);
});
```

Each option accepts a plain value or an **expression factory**. Expression factories are
typed: the `t` argument has the same shape as the entity type, so the compiler checks field
names and navigation paths.

## `$select`

```typescript
q.select(['UserName', 'FirstName']);
q.select(({ e, t }) => e().field(t.UserName).field(t.FirstName));
// Navigation paths: $select=Car/Model/Name,Age
q.select(({ e, t }) => e().field(t.Car?.Model?.Name).field(t.Age));
```

## `$filter`

Plain values are strings, objects or arrays:

```typescript
q.filter("FirstName eq 'Russell'");
q.filter({ Age: { lt: 30 } });
q.filter({ Id: { in: [1, 2, 3] } });
q.filter({ or: [{ FirstName: 'Russell' }, { FirstName: 'Scott' }] });
q.filter({ not: { Id: { in: [1, 2, 3] } } });
```

The factory gives you `e` (a new expression, with an optional `'and'` or `'or'`
connector), `t` (typed fields), `f` (canonical functions) and `o` (operators):

```typescript
// Id eq 1 and Type/Id ne 3 and startswith(Name, 'a')
q.filter(({ e }) => e().eq('Id', 1).ne('Type/Id', 3).startsWith('Name', 'a'));

// Id eq 1 or Type/Id ne 3 or endswith(Name, 'a')
q.filter(({ e }) => e('or').eq('Id', 1).ne('Type/Id', 3).endsWith('Name', 'a'));

// tolower(CompanyName) eq 'alfreds futterkiste'
q.filter(({ e, f }) => e().eq(f.toLower('CompanyName'), 'alfreds futterkiste'));

// Navigation through complex properties: Location/City/Region eq 'California'
q.filter(({ e, t }) => e().eq(t.Location.City.Region, 'California'));

// Lambda operators over a collection of entities:
// PlanItems/any(p:startswith(p/ConfirmationCode, 'CO'))
q.filter(({ e, t }) =>
  e().any(t.PlanItems, ({ e, t }) => e().startsWith(t.ConfirmationCode, 'CO')),
);

// ... and over a collection of primitive values, combined with or:
// Emails/any(e:e eq 'Javier@contoso.com') or contains(UserName, 'javier')
q.filter(({ e, t }) =>
  e()
    .any(t.Emails, ({ e, t }) => e().eq(t, 'Javier@contoso.com'))
    .or(e().contains(t.UserName, 'javier')),
);
```

The expression supports the comparison operators `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `has`
and `in`; the string functions `contains`, `startsWith` and `endsWith`; the logical
operators `and`, `or` and `not`; the lambda operators `any` and `all`; and `isof` and
`count`. `f` provides the other canonical functions (`length`, `toUpper`, `trim`, `indexOf`,
`subString`, `concat`, `year`, and so on).

When the factory callback has a second argument, it receives the current expression, so you
can add conditions to an existing filter.

## `$expand`

```typescript
q.expand(['Friends', 'Trips']);
q.expand({ Trips: { select: ['Name'], orderBy: 'Name', top: 5 } });

// $expand=Friends($expand=Friends),Trips($select=Name,Tags)
q.expand(({ e, t }) =>
  e()
    .field(t.Friends, (f) => f.expand(({ e, t }) => e().field(t.Friends)))
    .field(t.Trips, (f) => f.select(({ e }) => e().fields('Name', 'Tags'))),
);

// $expand=Photo,Trips,Friends($levels=2)
q.expand(({ e, t }) =>
  e()
    .field(t.Photo)
    .field(t.Trips)
    .field(t.Friends, (f) => f.levels(2)),
);

// $expand=Trips($select=Name;$filter=year(StartsAt) eq 2024;$orderBy=StartsAt asc;$top=1)
q.expand(({ e, t }) =>
  e().field(t.Trips, (f) => {
    f.select(({ e, t }) => e().field(t.Name));
    f.filter(({ e, f, t }) => e().eq(f.year(t.StartsAt), 2024));
    f.orderBy(({ e, t }) => e().ascending(t.StartsAt));
    f.top(1);
  }),
);
```

Inside an expanded field you can call `select`, `expand`, `filter`, `search`, `orderBy`,
`compute`, `skip`, `top`, `levels` and `count`.

## `$orderby`

```typescript
q.orderBy('LastName desc');
q.orderBy(['LastName', 'FirstName']);
q.orderBy(({ e, t }) => e().descending(t.Age).ascending(t.LastName));
```

## `$search`

```typescript
q.search('John');
q.search(({ e }) => e().term('John'));
```

## `$compute`

`compute()` takes a string or a factory. Each `field()` adds a computed property built with
the operators (`o`) and functions (`f`):

```typescript
// Northwind: $compute=UnitPrice add 2 as DoublePrice
products.query((q) =>
  q.compute(({ e, t }) => e().field('DoublePrice', ({ o }) => o.add(t.UnitPrice, 2))),
);
```

## `$apply`

`apply()` takes a string. `transform()` takes an object that is converted to an `$apply`
expression.

Resources also have a `transform()` method that takes an apply factory and returns a new
resource typed with the shape of the result:

```typescript
// People?$apply=groupby((Gender))
const genders = people.transform<{ Gender: PersonGender }>(({ e, t }) =>
  e().groupBy(() => [t.Gender]),
);
genders.fetch().subscribe(({ entities }) => {});
```

The apply expression also has `aggregate`, `filter`, `search`, `expand`, `concat` and
`identity`.

## `$format`

`format()` takes a string.

## Paging

```typescript
q.top(20);
q.skip(40);
q.skiptoken('abc');
q.paging({ skip: 40, top: 20 });
q.removePaging();
```

`fetchAll()` and `fetchMany()` follow the next links of the server for you. See
[Resources](resources.html).

## Example: a server-side table

Data tables usually send paging, sorting and filtering to the server. This handler, adapted
from the demo application, builds a new resource for each change of the table:

```typescript
loadPage({ first, rows, sortField, sortOrder }: TableState) {
  const people = this.peopleService.entities().query((q) => {
    if (first) q.skip(first);
    if (rows) q.top(rows);
    if (sortField)
      q.orderBy(({ e }) => (sortOrder === 1 ? e().ascending(sortField) : e().descending(sortField)));
  });
  people.fetch({ withCount: true }).subscribe(({ entities, annots }) => {
    this.rows.set(entities ?? []);
    this.total.set(annots.count ?? 0);
  });
}

search(field: string, value: string) {
  // contains(tolower(FirstName), 'rus')
  const people = this.peopleService
    .entities()
    .query((q) => q.filter(({ e, f }) => e().contains(f.toLower(field), value.toLowerCase())));
  people.fetch().subscribe(({ entities }) => this.rows.set(entities ?? []));
}
```

Field names can be strings when they come from the user interface, as here, or typed
fields (`t.FirstName`) when they are known at compile time.

## Reading and resetting options

Each method returns a handler when called without arguments:

```typescript
people.query((q) => {
  const top = q.top().value();
  q.select().push('LastName');
  q.filter().clear();
});
```

Other useful methods of the handler are `remove(...options)`, `keep(...options)`, `clear()`,
`store()` and `restore()`, and `toJson()` and `fromJson()`.

## Sending query options in the body

Long URLs can exceed the limits of some servers. Add the option names to
`bodyQueryOptions`, in the API configuration or in the request options, to send them in
the body of a `GET /$query` request:

```typescript
people.fetch({ bodyQueryOptions: [QueryOption.filter, QueryOption.select] });
```
