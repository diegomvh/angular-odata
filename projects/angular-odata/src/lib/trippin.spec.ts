import {
  ApiConfig,
  EnumTypeConfig,
  StructuredTypeConfig,
  EntitySetConfig,
} from './types';
import { EDM_PARSERS } from './parsers';
import { ODataEntitySetService } from './services';
import { Injectable } from '@angular/core';
import { ODataClient } from './client';

export const SERVICE_ROOT = 'https://services.odata.org/v4/TripPinServiceRW/';
export const NAMESPACE = 'TripPin';

//#region Enum
export enum PersonGender {
  Male = 0,
  Female = 1,
  Unknown = 2,
}
export const PersonGenderConfig = {
  name: 'PersonGender',
  members: PersonGender,
  fields: {},
} as EnumTypeConfig<PersonGender>;
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
} as StructuredTypeConfig<Photo>;

export interface PlanItem {
  PlanItemId: number;
  ConfirmationCode?: string;
  StartsAt?: Date;
  EndsAt?: Date;
  Duration?: string;
}
export const PlanItemConfig = {
  name: 'PlanItem',
  annotations: [],
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
    ConfirmationCode: { type: 'Edm.String' },
    StartsAt: { type: 'Edm.Date' },
    EndsAt: { type: 'Edm.Date' },
    Duration: { type: 'Edm.String' },
  },
} as StructuredTypeConfig<PlanItem>;

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
} as StructuredTypeConfig<Trip>;

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
} as StructuredTypeConfig<Person>;
//#endregion

//#region Services
@Injectable()
export class PeopleService extends ODataEntitySetService<Person> {
  constructor(protected client: ODataClient) {
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
  serviceRootUrl: SERVICE_ROOT,
  options: {
    stringAsEnum: true,
    stripMetadata: 'full',
    fetchPolicy: 'no-cache',
  },
  schemas: [
    {
      namespace: `${NAMESPACE}`,
      enums: [PersonGenderConfig],
      entities: [PhotoConfig, PersonConfig, PlanItemConfig, TripConfig],
      containers: [
        {
          entitySets: [PeopleConfig],
        },
      ],
    },
  ],
  parsers: EDM_PARSERS,
} as ApiConfig;
