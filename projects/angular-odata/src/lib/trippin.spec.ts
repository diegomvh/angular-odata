import { Injectable } from '@angular/core';
import { ODataClient } from './client';
import { EDM_PARSERS } from './schema';
import { ODataEntitySetService } from './services';
import {
  ApiConfig,
  EntitySetConfig,
  EnumTypeConfig,
  StructuredTypeConfig,
} from './types';

export const CONFIG_NAME = 'TripPin';
export const SERVICE_ROOT = 'https://services.odata.org/v4/TripPinServiceRW/';
export const NAMESPACE = 'TripPin';

//#region Enum
export enum FlagEnums {
  Flag1 = 1 << 0,
  Flag2 = 1 << 1,
  Flag4 = 1 << 2,
}
export enum PersonGender {
  Male = 0,
  Female = 1,
  Unknown = 2,
}
export const FlagEnumsConfig = {
  name: 'FlagEnums',
  flags: true,
  members: FlagEnums,
  fields: {
    Flag1: { value: FlagEnums.Flag1 },
    Flag2: { value: FlagEnums.Flag2 },
    Flag4: { value: FlagEnums.Flag4 },
  },
} as EnumTypeConfig;
export const PersonGenderConfig = {
  name: 'PersonGender',
  members: PersonGender,
  fields: {
    Male: { value: PersonGender.Male },
    Female: { value: PersonGender.Female },
    Unknown: { value: PersonGender.Unknown },
  },
} as EnumTypeConfig;
//#endregion

//#region Entities
export interface Photo {
  Id: number;
  Name?: string;
}
export const PhotoConfig = {
  name: 'Photo',
  annotations: [{ term: 'Org.OData.Core.V1.AcceptableMediaTypes' }],
  fields: {
    Id: {
      type: 'Edm.Int64',
      nullable: false,
      annotations: [
        {
          term: 'Org.OData.Core.V1.Permissions',
          permissions: ['Org.OData.Core.V1.Permission/Read'],
        },
      ],
    },
    Name: { type: 'Edm.String' },
  },
} as StructuredTypeConfig;

export interface Airline {
  AirlineCode: string;
  Name: string;
}

export const AirlineEntityConfig = {
  name: 'Airline',
  keys: [{ name: 'AirlineCode' }],
  fields: {
    AirlineCode: {
      type: 'Edm.String',
      nullable: false,
      annotations: [
        {
          term: 'Org.OData.Core.V1.Permissions',
          permissions: ['Org.OData.Core.V1.Permission/Read'],
        },
      ],
    },
    Name: { type: 'Edm.String', nullable: false },
  },
} as StructuredTypeConfig;

export interface Airport {
  IcaoCode: string;
  Name: string;
  IataCode: string;
}

export const AirportEntityConfig = {
  name: 'Airport',
  keys: [{ name: 'IcaoCode' }],
  fields: {
    IcaoCode: {
      type: 'Edm.String',
      nullable: false,
      annotations: [
        {
          term: 'Org.OData.Core.V1.Permissions',
          permissions: ['Org.OData.Core.V1.Permission/Read'],
        },
      ],
    },
    Name: { type: 'Edm.String', nullable: false },
    IataCode: {
      type: 'Edm.String',
      nullable: false,
      annotations: [{ term: 'Org.OData.Core.V1.Immutable', bool: true }],
    },
  },
} as StructuredTypeConfig;

export interface PlanItem {
  PlanItemId: number;
  ConfirmationCode?: string;
  Description?: string;
  StartsAt?: Date;
  OccursAt?: any;
  EndsAt?: Date;
  Duration?: string;
}
export const PlanItemConfig = {
  name: 'PlanItem',
  keys: [{ name: 'PlanItemId' }],
  fields: {
    PlanItemId: {
      type: 'Edm.Int64',
      nullable: false,
      annotations: [
        {
          term: 'Org.OData.Core.V1.Permissions',
          permissions: ['Org.OData.Core.V1.Permission/Read'],
        },
      ],
    },
    ConfirmationCode: { type: 'Edm.String', default: '0' },
    StartsAt: {
      type: 'Edm.DateTimeOffset',
      default: '2022-08-05T15:50:12.052Z',
    },
    EndsAt: { type: 'Edm.DateTimeOffset' },
    Duration: { type: 'Edm.String', default: 'M' },
  },
} as StructuredTypeConfig;
export interface PublicTransportation extends PlanItem {
  SeatNumber?: string;
}

export const PublicTransportationEntityConfig = {
  name: 'PublicTransportation',
  base: `${NAMESPACE}.PlanItem`,
  fields: {
    SeatNumber: { type: 'Edm.String', default: '0' },
  },
} as StructuredTypeConfig;

export interface Flight extends PublicTransportation {
  FlightNumber: string;
  From?: Airport;
  To?: Airport;
  Airline?: Airline;
}

export const FlightEntityConfig = {
  name: 'Flight',
  base: `${NAMESPACE}.PublicTransportation`,
  fields: {
    FlightNumber: { type: 'Edm.String', nullable: false, default: '0' },
    From: { type: `${NAMESPACE}.Airport`, navigation: true },
    To: { type: `${NAMESPACE}.Airport`, navigation: true },
    Airline: { type: `${NAMESPACE}.Airline`, navigation: true },
  },
} as StructuredTypeConfig;

export interface Trip {
  TripId: number;
  ShareId?: string;
  Description?: string;
  Name: string;
  Budget: number;
  StartsAt: Date;
  EndsAt: Date;
  Tags: string[];
  Photos?: Photo[];
  PlanItems?: PlanItem[];
}
export const TripConfig = {
  name: 'Trip',
  annotations: [],
  fields: {
    TripId: {
      type: 'Edm.Int64',
      nullable: false,
      annotations: [
        {
          term: 'Org.OData.Core.V1.Permissions',
          permissions: ['Org.OData.Core.V1.Permission/Read'],
        },
      ],
    },
    ShareId: { type: 'Edm.String' },
    Description: { type: 'Edm.String' },
    Name: { type: 'Edm.String', nullable: false },
    Budget: {
      type: 'Edm.Int64',
      nullable: false,
      annotations: [
        { term: 'Org.OData.Measures.V1.ISOCurrency', string: 'USD' },
        { term: 'Org.OData.Measures.V1.Scale', int: 2 },
      ],
    },
    StartsAt: { type: 'Edm.DateTimeOffset', nullable: false },
    EndsAt: { type: 'Edm.DateTimeOffset', nullable: false },
    Tags: { type: 'Edm.String', nullable: false, collection: true },
    Photos: { type: `${NAMESPACE}.Photo`, collection: true, navigation: true },
    PlanItems: {
      type: `${NAMESPACE}.PlanItem`,
      collection: true,
      navigation: true,
    },
  },
} as StructuredTypeConfig;

export interface Person {
  UserName: string;
  FirstName: string;
  LastName: string;
  Emails?: string[];
  Gender?: PersonGender;
  Friends?: Person[];
  Trips?: Trip[];
  Photo?: Photo;
}
export const PersonConfig = {
  name: 'Person',
  annotations: [],
  fields: {
    UserName: {
      type: 'Edm.String',
      nullable: false,
      annotations: [
        {
          term: 'Org.OData.Core.V1.Permissions',
          permissions: ['Org.OData.Core.V1.Permission/Read'],
        },
      ],
    },
    FirstName: { type: 'Edm.String', nullable: false },
    LastName: { type: 'Edm.String', nullable: false },
    Emails: { type: 'Edm.String', collection: true },
    Gender: { type: `${NAMESPACE}.PersonGender` },
    Concurrency: {
      type: 'Edm.Int64',
      nullable: false,
      annotations: [{ term: 'Org.OData.Core.V1.Computed', bool: true }],
    },
    Friends: {
      type: `${NAMESPACE}.Person`,
      collection: true,
      navigation: true,
    },
    Trips: { type: `${NAMESPACE}.Trip`, collection: true, navigation: true },
    Photo: { type: `${NAMESPACE}.Photo`, navigation: true },
  },
} as StructuredTypeConfig;
//#endregion

//#region Services
@Injectable()
export class PeopleService extends ODataEntitySetService<Person> {
  constructor(client: ODataClient) {
    super(client, 'People', `${NAMESPACE}.Person`);
  }
}
export const PeopleConfig = {
  name: 'People',
  entityType: `${NAMESPACE}.Person`,
  service: PeopleService,
} as EntitySetConfig;
//#endregion

export const TripPinConfig = {
  name: CONFIG_NAME,
  serviceRootUrl: SERVICE_ROOT,
  options: {
    stringAsEnum: true,
    stripMetadata: 'full',
    fetchPolicy: 'no-cache',
  },
  schemas: [
    {
      namespace: `${NAMESPACE}`,
      enums: [PersonGenderConfig, FlagEnumsConfig],
      entities: [
        PhotoConfig,
        PersonConfig,
        PlanItemConfig,
        TripConfig,
        PublicTransportationEntityConfig,
        FlightEntityConfig,
        AirlineEntityConfig,
        AirportEntityConfig,
      ],
      containers: [
        {
          entitySets: [PeopleConfig],
        },
      ],
    },
  ],
  parsers: EDM_PARSERS,
} as ApiConfig;
