import { of, throwError } from 'rxjs';

import { ODataAsyncLoader, ODataMetadataLoader, ODataSyncLoader } from './loaders';
import { ODataApiConfig } from './types';

const config = (name: string): ODataApiConfig => ({
  name,
  serviceRootUrl: `https://${name}.example.com/odata`,
});

const requester = () => of(null as any);

describe('ODataSyncLoader', () => {
  it('should wrap a single config in an array', async () => {
    const loader = new ODataSyncLoader(config('a'), requester);
    const result = await loader.load();
    expect(result.configs.length).toBe(1);
    expect(result.configs[0].name).toBe('a');
  });

  it('should keep an array of configs', async () => {
    const loader = new ODataSyncLoader([config('a'), config('b')], requester);
    const result = await loader.load();
    expect(result.configs.map((c) => c.name)).toEqual(['a', 'b']);
  });

  it('should return the requester', async () => {
    const req = requester;
    const loader = new ODataSyncLoader(config('a'), req);
    const result = await loader.load();
    expect(result.requester).toBe(req);
  });
});

describe('ODataAsyncLoader', () => {
  it('should resolve an array of observables', async () => {
    const loader = new ODataAsyncLoader([of(config('a')), of(config('b'))], requester);
    const result = await loader.load();
    expect(result.configs.map((c) => c.name)).toEqual(['a', 'b']);
  });

  it('should resolve a single observable of a config', async () => {
    const loader = new ODataAsyncLoader(of(config('a')), requester);
    const result = await loader.load();
    expect(result.configs.length).toBe(1);
    expect(result.configs[0].name).toBe('a');
  });

  it('should resolve a single observable of an array of configs', async () => {
    const loader = new ODataAsyncLoader(of([config('a'), config('b')]), requester);
    const result = await loader.load();
    expect(result.configs.map((c) => c.name)).toEqual(['a', 'b']);
  });

  it('should reject when a source errors', async () => {
    const loader = new ODataAsyncLoader(
      throwError(() => new Error('boom')),
      requester,
    );
    await expect(loader.load()).rejects.toThrow('boom');
  });
});

describe('ODataMetadataLoader', () => {
  const metadata = `<?xml version="1.0" encoding="utf-8"?>
    <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
      <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Test">
          <EntityType Name="Person">
            <Key><PropertyRef Name="Id" /></Key>
            <Property Name="Id" Type="Edm.String" Nullable="false" />
          </EntityType>
        </Schema>
      </edmx:DataServices>
    </edmx:Edmx>`;

  it('should parse a single metadata source', async () => {
    const loader = new ODataMetadataLoader(of(metadata), config('a'), requester);
    const result = await loader.load();
    expect(result.configs.length).toBe(1);
    expect(result.configs[0].schemas?.[0].namespace).toBe('Test');
  });

  it('should parse an array of metadata sources', async () => {
    const loader = new ODataMetadataLoader(
      of([metadata, metadata]),
      [config('a'), config('b')],
      requester,
    );
    const result = await loader.load();
    expect(result.configs.length).toBe(2);
    expect(result.configs.map((c) => c.name)).toEqual(['a', 'b']);
  });

  it('should merge the parsed metadata into the base config', async () => {
    const loader = new ODataMetadataLoader(of(metadata), config('a'), requester);
    const result = await loader.load();
    expect(result.configs[0].name).toBe('a');
    expect(result.configs[0].serviceRootUrl).toBe('https://a.example.com/odata');
  });
});
