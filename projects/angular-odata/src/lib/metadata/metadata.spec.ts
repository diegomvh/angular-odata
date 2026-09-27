import { EDM_PARSERS } from '../schema';
import { ODataMetadata } from './metadata';
import {
  TRIPPIN_CONFIG_NAME,
  TRIPPIN_NAMESPACE,
  TRIPPIN_SERVICE_ROOT,
  TripPinMetadata,
} from '../trippin.config';
import {
  ODataApiConfig,
  ODataCallableConfig,
  ODataEntityContainerConfig,
  ODataEntitySetConfig,
  ODataEnumTypeConfig,
  ODataSchemaConfig,
  ODataStructuredTypeConfig,
} from '../types';

describe('ODataMetadata', () => {
  it('should create config from metadata', () => {
    const config = TripPinMetadata.toConfig({
      name: TRIPPIN_CONFIG_NAME,
      serviceRootUrl: TRIPPIN_SERVICE_ROOT,
      parsers: EDM_PARSERS,
    }) as ODataApiConfig;
    expect(config.name).toEqual(TRIPPIN_CONFIG_NAME);
    expect(config.serviceRootUrl).toEqual(TRIPPIN_SERVICE_ROOT);
    expect(config.version).toEqual('4.0');
    expect(config.references).toEqual([]);
    expect(config.parsers?.['Edm.String']).toBeDefined();

    const schema = config.schemas?.[0] as ODataSchemaConfig;
    expect(schema.namespace).toEqual(TRIPPIN_NAMESPACE);

    const person = schema.entities?.find((e) => e.name === 'Person') as ODataStructuredTypeConfig;
    expect(person.open).toBeTruthy();
    expect(person.keys).toEqual([{ name: 'UserName' }]);
    expect(person.fields?.['UserName']).toEqual({
      annotations: [
        {
          term: 'Org.OData.Core.V1.Permissions',
          values: ['Org.OData.Core.V1.Permission/Read'],
        },
      ],
      name: 'UserName',
      type: 'Edm.String',
      collection: false,
      nullable: false,
      navigation: false,
    });
    expect(person.fields?.['Friends']).toEqual({
      name: 'Friends',
      type: `${TRIPPIN_NAMESPACE}.Person`,
      collection: true,
      navigation: true,
    });
    expect(person.fields?.['Gender']?.type).toEqual(`${TRIPPIN_NAMESPACE}.PersonGender`);

    const gender = schema.enums?.find((e) => e.name === 'PersonGender') as ODataEnumTypeConfig;
    expect(gender.fields).toEqual({
      Male: { value: 0 },
      Female: { value: 1 },
      Unknown: { value: 2 },
    });

    const getFriendsTrips = schema.callables?.find(
      (c) => c.name === 'GetFriendsTrips',
    ) as ODataCallableConfig;
    expect(getFriendsTrips.bound).toBeTruthy();
    expect(getFriendsTrips.entitySetPath).toEqual('person/Friends/Trips');
    expect(getFriendsTrips.return).toEqual({
      type: `${TRIPPIN_NAMESPACE}.Trip`,
      collection: false,
    });

    const container = schema.containers?.[0] as ODataEntityContainerConfig;
    expect(container.entitySets?.map((e) => e.name)).toEqual([
      'Photos',
      'People',
      'Airlines',
      'Airports',
    ]);
    const people = container.entitySets?.find((e) => e.name === 'People') as ODataEntitySetConfig;
    expect(people.entityType).toEqual(`${TRIPPIN_NAMESPACE}.Person`);
  });

  it('should create annotations for schema', () => {
    const config = TripPinMetadata.toConfig({
      name: TRIPPIN_CONFIG_NAME,
      serviceRootUrl: TRIPPIN_SERVICE_ROOT,
      parsers: EDM_PARSERS,
    }) as ODataApiConfig;
    const schema = config.schemas?.[0] as ODataSchemaConfig;
    expect(schema.annotations?.map((a) => a.term)).toEqual([
      'Org.OData.Core.V1.DereferenceableIDs',
      'Org.OData.Core.V1.ConventionalIDs',
      'Org.OData.Capabilities.V1.ConformanceLevel',
      'Org.OData.Capabilities.V1.SupportedFormats',
      'Org.OData.Capabilities.V1.AsynchronousRequestsSupported',
      'Org.OData.Capabilities.V1.BatchContinueOnErrorSupported',
      'Org.OData.Capabilities.V1.FilterFunctions',
    ]);
    expect(schema.annotations?.[0]?.term).toEqual('Org.OData.Core.V1.DereferenceableIDs');
    expect(schema.annotations?.[2]).toEqual({
      term: 'Org.OData.Capabilities.V1.ConformanceLevel',
      values: ['Org.OData.Capabilities.V1.ConformanceLevelType/Advanced'],
    });
    expect(schema.annotations?.[3]?.values).toEqual([
      'application/json;odata.metadata=full;IEEE754Compatible=false;odata.streaming=true',
      'application/json;odata.metadata=minimal;IEEE754Compatible=false;odata.streaming=true',
      'application/json;odata.metadata=none;IEEE754Compatible=false;odata.streaming=true',
    ]);
    expect(schema.annotations?.[6]?.values).toEqual([
      'contains',
      'endswith',
      'startswith',
      'length',
      'indexof',
      'substring',
      'tolower',
      'toupper',
      'trim',
      'concat',
      'year',
      'month',
      'day',
      'hour',
      'minute',
      'second',
      'round',
      'floor',
      'ceiling',
      'cast',
      'isof',
    ]);
  });

  it('should create annotations for entity set', () => {
    const config = TripPinMetadata.toConfig({
      name: TRIPPIN_CONFIG_NAME,
      serviceRootUrl: TRIPPIN_SERVICE_ROOT,
      parsers: EDM_PARSERS,
    }) as ODataApiConfig;
    const schema = config.schemas?.[0] as ODataSchemaConfig;
    const container = schema.containers?.[0] as ODataEntityContainerConfig;
    const people = container.entitySets?.find((e) => e.name === 'People') as ODataEntitySetConfig;
    expect(people.annotations?.map((a) => a.term)).toEqual([
      'Org.OData.Core.V1.OptimisticConcurrency',
      'Org.OData.Core.V1.ResourcePath',
      'Org.OData.Capabilities.V1.NavigationRestrictions',
      'Org.OData.Capabilities.V1.SearchRestrictions',
      'Org.OData.Capabilities.V1.InsertRestrictions',
    ]);
    expect(people.annotations?.[0]).toEqual({
      term: 'Org.OData.Core.V1.OptimisticConcurrency',
      values: ['Concurrency'],
    });
    expect(people.annotations?.[1]).toEqual({
      term: 'Org.OData.Core.V1.ResourcePath',
      string: 'People',
    });
    expect(people.annotations?.[2]?.values).toEqual([
      { enumMembers: ['Org.OData.Capabilities.V1.NavigationType/None'] },
      {},
    ]);
  });

  it('should return functions and actions', () => {
    expect(TripPinMetadata.functions().map((f) => f.Name)).toEqual([
      'GetFavoriteAirline',
      'GetInvolvedPeople',
      'GetFriendsTrips',
      'GetNearestAirport',
    ]);
    expect(TripPinMetadata.actions().map((a) => a.Name)).toEqual(['ResetDataSource', 'ShareTrip']);
  });

  it('should create config for complex types', () => {
    const config = TripPinMetadata.toConfig({
      name: TRIPPIN_CONFIG_NAME,
      serviceRootUrl: TRIPPIN_SERVICE_ROOT,
      parsers: EDM_PARSERS,
    }) as ODataApiConfig;
    const schema = config.schemas?.[0] as ODataSchemaConfig;
    expect(schema.entities?.slice(0, 4).map((e) => e.name)).toEqual([
      'City',
      'Location',
      'EventLocation',
      'AirportLocation',
    ]);
    const city = schema.entities?.find((e) => e.name === 'City') as ODataStructuredTypeConfig;
    expect(city.keys).toBeUndefined();
    expect(Object.keys(city.fields ?? {})).toEqual(['CountryRegion', 'Name', 'Region']);
    const eventLocation = schema.entities?.find(
      (e) => e.name === 'EventLocation',
    ) as ODataStructuredTypeConfig;
    expect(eventLocation.base).toEqual(`${TRIPPIN_NAMESPACE}.Location`);
    expect(eventLocation.open).toBeTruthy();
    expect(eventLocation.fields?.['BuildingInfo']).toEqual({
      name: 'BuildingInfo',
      type: 'Edm.String',
      collection: false,
      navigation: false,
    });
    const airportLocation = schema.entities?.find(
      (e) => e.name === 'AirportLocation',
    ) as ODataStructuredTypeConfig;
    expect(airportLocation.fields?.['Loc']).toEqual({
      name: 'Loc',
      type: 'Edm.GeographyPoint',
      collection: false,
      nullable: false,
      navigation: false,
    });
  });

  it('should create config for entity types', () => {
    const config = TripPinMetadata.toConfig({
      name: TRIPPIN_CONFIG_NAME,
      serviceRootUrl: TRIPPIN_SERVICE_ROOT,
      parsers: EDM_PARSERS,
    }) as ODataApiConfig;
    const schema = config.schemas?.[0] as ODataSchemaConfig;
    const photo = schema.entities?.find((e) => e.name === 'Photo') as ODataStructuredTypeConfig;
    expect(photo.keys).toEqual([{ name: 'Id' }]);
    expect(photo.open).toBeFalsy();
    const airline = schema.entities?.find((e) => e.name === 'Airline') as ODataStructuredTypeConfig;
    expect(airline.keys).toEqual([{ name: 'AirlineCode' }]);
    const trip = schema.entities?.find((e) => e.name === 'Trip') as ODataStructuredTypeConfig;
    expect(trip.keys).toEqual([{ name: 'TripId' }]);
    expect(trip.fields?.['Tags']).toEqual({
      name: 'Tags',
      type: 'Edm.String',
      collection: true,
      nullable: false,
      navigation: false,
    });
  });

  it('should create config for inherited entity types', () => {
    const config = TripPinMetadata.toConfig({
      name: TRIPPIN_CONFIG_NAME,
      serviceRootUrl: TRIPPIN_SERVICE_ROOT,
      parsers: EDM_PARSERS,
    }) as ODataApiConfig;
    const schema = config.schemas?.[0] as ODataSchemaConfig;
    const publicTransportation = schema.entities?.find(
      (e) => e.name === 'PublicTransportation',
    ) as ODataStructuredTypeConfig;
    expect(publicTransportation.base).toEqual(`${TRIPPIN_NAMESPACE}.PlanItem`);
    expect(publicTransportation.keys).toBeUndefined();
    expect(publicTransportation.fields?.['SeatNumber']).toEqual({
      name: 'SeatNumber',
      type: 'Edm.String',
      collection: false,
      navigation: false,
    });
    const flight = schema.entities?.find((e) => e.name === 'Flight') as ODataStructuredTypeConfig;
    expect(flight.base).toEqual(`${TRIPPIN_NAMESPACE}.PublicTransportation`);
    expect(flight.fields?.['FlightNumber']).toEqual({
      name: 'FlightNumber',
      type: 'Edm.String',
      collection: false,
      nullable: false,
      navigation: false,
    });
    expect(Object.keys(flight.fields ?? {})).toEqual(['FlightNumber', 'From', 'To', 'Airline']);
  });

  it('should create config for callables', () => {
    const config = TripPinMetadata.toConfig({
      name: TRIPPIN_CONFIG_NAME,
      serviceRootUrl: TRIPPIN_SERVICE_ROOT,
      parsers: EDM_PARSERS,
    }) as ODataApiConfig;
    const schema = config.schemas?.[0] as ODataSchemaConfig;
    expect(schema.callables?.map((c) => c.name)).toEqual([
      'GetFavoriteAirline',
      'GetInvolvedPeople',
      'GetFriendsTrips',
      'GetNearestAirport',
      'ResetDataSource',
      'ShareTrip',
    ]);
    const getNearestAirport = schema.callables?.find(
      (c) => c.name === 'GetNearestAirport',
    ) as ODataCallableConfig;
    expect(getNearestAirport.bound).toBeFalsy();
    expect(getNearestAirport.composable).toBeTruthy();
    expect(getNearestAirport.parameters).toEqual([
      { type: 'Edm.Double', nullable: false, collection: false },
      { type: 'Edm.Double', nullable: false, collection: false },
    ]);
    expect(getNearestAirport.return).toEqual({
      type: `${TRIPPIN_NAMESPACE}.Airport`,
      collection: false,
    });
    const resetDataSource = schema.callables?.find(
      (c) => c.name === 'ResetDataSource',
    ) as ODataCallableConfig;
    expect(resetDataSource.bound).toBeUndefined();
    expect(resetDataSource.parameters).toBeUndefined();
    expect(resetDataSource.return).toBeUndefined();
    const shareTrip = schema.callables?.find((c) => c.name === 'ShareTrip') as ODataCallableConfig;
    expect(shareTrip.bound).toBeTruthy();
    expect(shareTrip.composable).toBeUndefined();
    expect(shareTrip.parameters).toEqual([
      { type: `${TRIPPIN_NAMESPACE}.Person`, nullable: false, collection: false },
      { type: 'Edm.String', nullable: false, collection: false },
      { type: 'Edm.Int32', nullable: false, collection: false },
    ]);
  });

  it('should create config from json round trip', () => {
    const config = TripPinMetadata.toConfig({
      name: TRIPPIN_CONFIG_NAME,
      serviceRootUrl: TRIPPIN_SERVICE_ROOT,
      parsers: EDM_PARSERS,
    }) as ODataApiConfig;
    const json = TripPinMetadata.toJson();
    expect(json.Version).toEqual('4.0');
    expect(json.References).toEqual([]);
    expect(json.Schemas.length).toEqual(1);
    expect(json.Schemas[0]['Namespace']).toEqual(TRIPPIN_NAMESPACE);
    const roundTrip = ODataMetadata.fromJson(json).toConfig({
      name: TRIPPIN_CONFIG_NAME,
      serviceRootUrl: TRIPPIN_SERVICE_ROOT,
      parsers: EDM_PARSERS,
    }) as ODataApiConfig;
    expect(roundTrip).toEqual(config);
  });
});
