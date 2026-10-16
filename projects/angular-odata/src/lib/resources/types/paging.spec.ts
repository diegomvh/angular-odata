import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { lastValueFrom, Observable, of, throwError } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { describe, expect, it, vi } from 'vitest';
import { ODataApi } from '../../api';
import { ODataInMemoryCache } from '../../cache/memory';
import { Person, TRIPPIN_NAMESPACE, TripPinConfig } from '../../trippin.config';
import { FetchPolicy } from '../../types';
import { ODataRequest } from '../request';

const ROOT = 'http://paging.test/';
const PAGE_SIZE = 2;
const PEOPLE = ['u1', 'u2', 'u3', 'u4', 'u5'].map((UserName) => ({ UserName }));

function respond(req: ODataRequest<any>) {
  const params = req.params;
  const skip = Number(params.get('$skip') ?? 0);
  const top = params.has('$top') ? Number(params.get('$top')) : Infinity;
  const value = PEOPLE.slice(skip, skip + Math.min(PAGE_SIZE, top));
  const next = skip + value.length;
  const body: { [name: string]: any } = { value };
  if (next < PEOPLE.length && top > value.length) {
    const topParam = top !== Infinity ? `$top=${top - value.length}&` : '';
    body['@odata.nextLink'] = `${ROOT}${req.path}?${topParam}$skip=${next}`;
  }
  return new HttpResponse({
    body,
    status: 200,
    url: req.urlWithParams,
    headers: new HttpHeaders({
      'Content-Type': 'application/json;odata.metadata=minimal;odata.streaming=true',
      'OData-Version': '4.0',
    }),
  });
}

function setup(
  {
    fetchPolicy,
    errorHandler,
  }: {
    fetchPolicy?: FetchPolicy;
    errorHandler?: (error: any, caught: Observable<any>) => Observable<never>;
  } = {},
  config: { [name: string]: any } = { serviceRootUrl: ROOT },
) {
  const requests: string[] = [];
  const api = new ODataApi({
    ...config,
    serviceRootUrl: ROOT,
    cache: new ODataInMemoryCache(),
    errorHandler,
    options: { ...config['options'], fetchPolicy },
  } as any);
  api.configure();
  api.requester = (req: ODataRequest<any>) => {
    requests.push(req.pathWithParams);
    return of(respond(req));
  };
  return { api, requests };
}

const emissions = <T>(obs$: Observable<T>) => lastValueFrom(obs$.pipe(toArray()));
const names = ({ entities }: { entities: any[] }) => entities.map((e) => e.UserName);
const ALL = PEOPLE.map((p) => p.UserName);

describe('fetchPages', () => {
  describe('fetchAll', () => {
    it('should emit the cached and the network result once each with cache-and-network', async () => {
      const { api, requests } = setup();
      const people = api.entitySet<any>('People');
      await emissions(people.fetchAll({ fetchPolicy: 'network-only' }));
      expect(requests.length).toBe(3);

      requests.length = 0;
      const results = await emissions(people.fetchAll({ fetchPolicy: 'cache-and-network' }));
      expect(results.length).toBe(2);
      expect(names(results[0])).toEqual(ALL);
      expect(names(results[1])).toEqual(ALL);
      expect(requests).toEqual(['People', 'People?$skip=2', 'People?$skip=4']);
    });

    it('should emit only the network result with cache-and-network and a cold cache', async () => {
      const errorHandler = vi.fn((error: any) => throwError(() => error));
      const { api, requests } = setup({ errorHandler });
      const results = await emissions(
        api.entitySet<any>('People').fetchAll({ fetchPolicy: 'cache-and-network' }),
      );
      expect(results.length).toBe(1);
      expect(names(results[0])).toEqual(ALL);
      expect(requests.length).toBe(3);
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should emit only the network result with cache-and-network and a partial cache', async () => {
      const errorHandler = vi.fn((error: any) => throwError(() => error));
      const { api, requests } = setup({ errorHandler });
      const people = api.entitySet<any>('People');
      await emissions(people.fetch({ fetchPolicy: 'network-only' }));

      requests.length = 0;
      const results = await emissions(people.fetchAll({ fetchPolicy: 'cache-and-network' }));
      expect(results.length).toBe(1);
      expect(names(results[0])).toEqual(ALL);
      expect(requests.length).toBe(3);
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should use the api fetch policy when the call has none', async () => {
      const { api, requests } = setup({ fetchPolicy: 'cache-and-network' });
      const people = api.entitySet<any>('People');
      expect((await emissions(people.fetchAll())).length).toBe(1);

      requests.length = 0;
      const results = await emissions(people.fetchAll());
      expect(results.length).toBe(2);
      expect(names(results[1])).toEqual(ALL);
      expect(requests.length).toBe(3);
    });

    it('should not request the server with cache-first and a warm cache', async () => {
      const { api, requests } = setup();
      const people = api.entitySet<any>('People');
      const first = await emissions(people.fetchAll({ fetchPolicy: 'cache-first' }));
      expect(requests.length).toBe(3);

      requests.length = 0;
      const second = await emissions(people.fetchAll({ fetchPolicy: 'cache-first' }));
      expect(requests.length).toBe(0);
      expect(second.length).toBe(1);
      expect(names(second[0])).toEqual(names(first[0]));
    });

    it('should emit once with cache-only and a warm cache', async () => {
      const { api, requests } = setup();
      const people = api.entitySet<any>('People');
      await emissions(people.fetchAll({ fetchPolicy: 'network-only' }));

      requests.length = 0;
      const results = await emissions(people.fetchAll({ fetchPolicy: 'cache-only' }));
      expect(results.length).toBe(1);
      expect(names(results[0])).toEqual(ALL);
      expect(requests.length).toBe(0);
    });

    it('should fail with cache-only and a partial cache', async () => {
      const errorHandler = vi.fn((error: any) => throwError(() => error));
      const { api } = setup({ errorHandler });
      const people = api.entitySet<any>('People');
      await emissions(people.fetch({ fetchPolicy: 'network-only' }));

      const error = await emissions(people.fetchAll({ fetchPolicy: 'cache-only' })).catch((e) => e);
      expect(api.isCacheMiss(error)).toBe(true);
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });

    it('should follow a composite skiptoken through every page', async () => {
      const { api } = setup();
      const tokens: (string | null)[] = [];
      const links = [
        "EventUsers?$skiptoken=EventId-1,UserId-'u%2C2'",
        'EventUsers?$skiptoken=EventId-2,UserId-%27u%263%27',
      ];
      api.requester = (req: ODataRequest<any>) => {
        tokens.push(req.params.get('$skiptoken'));
        const next = links[tokens.length - 1];
        const body: { [name: string]: any } = { value: [{ UserName: `u${tokens.length}` }] };
        if (next) body['@odata.nextLink'] = `${ROOT}${next}`;
        return of(new HttpResponse({ body, status: 200 }));
      };
      const results = await emissions(api.entitySet<any>('EventUsers').fetchAll());
      expect(tokens).toEqual([null, "EventId-1,UserId-'u,2'", "EventId-2,UserId-'u&3'"]);
      expect(names(results[0])).toEqual(['u1', 'u2', 'u3']);
    });

    it('should page through a navigation property with cache-and-network', async () => {
      const { api, requests } = setup();
      const friends = api
        .entitySet<any>('People')
        .entity('russell')
        .navigationProperty<any>('Friends');
      await emissions(friends.fetchAll({ fetchPolicy: 'network-only' }));

      requests.length = 0;
      const results = await emissions(friends.fetchAll({ fetchPolicy: 'cache-and-network' }));
      expect(results.length).toBe(2);
      expect(names(results[0])).toEqual(ALL);
      expect(names(results[1])).toEqual(ALL);
      expect(requests).toEqual([
        "People('russell')/Friends",
        "People('russell')/Friends?$skip=2",
        "People('russell')/Friends?$skip=4",
      ]);
    });
  });

  describe('fetchMany', () => {
    it('should emit the cached and the network result once each with cache-and-network', async () => {
      const { api, requests } = setup();
      const people = api.entitySet<any>('People');
      await emissions(people.fetchMany(3, { fetchPolicy: 'network-only' }));
      expect(requests.length).toBe(2);
      expect(requests[0]).toBe('People?$top=3');

      requests.length = 0;
      const results = await emissions(people.fetchMany(3, { fetchPolicy: 'cache-and-network' }));
      expect(results.length).toBe(2);
      expect(names(results[0])).toEqual(['u1', 'u2', 'u3']);
      expect(names(results[1])).toEqual(['u1', 'u2', 'u3']);
      expect(requests.length).toBe(2);
    });

    it('should emit only the network result with cache-and-network and a cold cache', async () => {
      const errorHandler = vi.fn((error: any) => throwError(() => error));
      const { api, requests } = setup({ errorHandler });
      const results = await emissions(
        api.entitySet<any>('People').fetchMany(3, { fetchPolicy: 'cache-and-network' }),
      );
      expect(results.length).toBe(1);
      expect(names(results[0])).toEqual(['u1', 'u2', 'u3']);
      expect(requests.length).toBe(2);
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should not request the server with cache-first and a warm cache', async () => {
      const { api, requests } = setup();
      const people = api.entitySet<any>('People');
      await emissions(people.fetchMany(3, { fetchPolicy: 'cache-first' }));

      requests.length = 0;
      const results = await emissions(people.fetchMany(3, { fetchPolicy: 'cache-first' }));
      expect(requests.length).toBe(0);
      expect(names(results[0])).toEqual(['u1', 'u2', 'u3']);
    });

    it('should emit once with cache-only and a warm cache', async () => {
      const { api, requests } = setup();
      const people = api.entitySet<any>('People');
      await emissions(people.fetchMany(3, { fetchPolicy: 'network-only' }));

      requests.length = 0;
      const results = await emissions(people.fetchMany(3, { fetchPolicy: 'cache-only' }));
      expect(results.length).toBe(1);
      expect(requests.length).toBe(0);
    });
  });

  describe('ODataCollection', () => {
    it('should end with every model once after fetchAll with cache-and-network', async () => {
      const { api, requests } = setup({}, TripPinConfig);
      const people = api.entitySet<Person>('People');
      expect(people.incomingType()).toBe(`${TRIPPIN_NAMESPACE}.Person`);
      await emissions(people.fetchAll({ fetchPolicy: 'network-only' }));

      requests.length = 0;
      const collection = people.asCollection([]);
      const results = await emissions(collection.fetchAll({ fetchPolicy: 'cache-and-network' }));
      expect(results.length).toBe(2);
      expect(requests.length).toBe(3);
      expect(collection.length).toBe(PEOPLE.length);
      expect(collection.models().map((m) => (m as any).UserName)).toEqual(ALL);
    });
  });
});
