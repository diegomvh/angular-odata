
import { Configuration, EnumConfig, EntityConfig, ServiceConfig } from './types';
import { DATE_PARSER, DECIMAL_PARSER } from './parsers';
import { ODataEntityService } from './services';
import { Injectable } from '@angular/core';

export const SERVICE_ROOT = 'https://services.odata.org/v4/TripPinServiceRW/';
export const NAMESPACE = 'TripPin';

//#region Enum
export enum PersonGender {
  Male = 0,
  Female = 1,
  Unknown = 2,
}
export const PersonGenderConfig = {
  name: "PersonGender",
  members: PersonGender
} as EnumConfig<PersonGender>;
//#endregion

//#region Entities
export interface Photo {
  Id: number;
  Name?: string;
}
export const PhotoConfig = {
  name: "Photo",
  annotations: [{"type":"Org.OData.Core.V1.AcceptableMediaTypes"}],
  fields: {
    Id: {type: 'Number', key: true, ref: 'Id', nullable: false, annotations: [{"type":"Org.OData.Core.V1.Permissions","permissions":["Org.OData.Core.V1.Permission/Read"]}]},
    Name: {type: 'String'}
  }
} as EntityConfig<Photo>;

export interface PlanItem {
  PlanItemId: number;
  ConfirmationCode?: string;
  StartsAt?: Date;
  EndsAt?: Date;
  Duration?: string;
}
export const PlanItemConfig = {
  name: "PlanItem",
  annotations: [],
  fields: {
    PlanItemId: {type: 'Number', key: true, ref: 'PlanItemId', nullable: false, annotations: [{"type":"Org.OData.Core.V1.Permissions","permissions":["Org.OData.Core.V1.Permission/Read"]}]},
    ConfirmationCode: {type: 'String'},
    StartsAt: {type: 'Date'},
    EndsAt: {type: 'Date'},
    Duration: {type: 'String'}
  }
} as EntityConfig<PlanItem>;

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
  name: "Trip",
  annotations: [],
  fields: {
    TripId: {type: 'Number', key: true, ref: 'TripId', nullable: false, annotations: [{"type":"Org.OData.Core.V1.Permissions","permissions":["Org.OData.Core.V1.Permission/Read"]}]},
    ShareId: {type: 'String'},
    Description: {type: 'String'},
    Name: {type: 'String', nullable: false},
    Budget: {type: 'Number', nullable: false, annotations: [{"type":"Org.OData.Measures.V1.ISOCurrency","string":"USD"},{"type":"Org.OData.Measures.V1.Scale","int":2}]},
    StartsAt: {type: 'Date', nullable: false},
    EndsAt: {type: 'Date', nullable: false},
    Tags: {type: 'String', nullable: false, collection: true},
    Photos: {type: `${NAMESPACE}.Photo`, collection: true, navigation: true},
    PlanItems: {type: `${NAMESPACE}.PlanItem`, collection: true, navigation: true}
  }
} as EntityConfig<Trip>;

export interface Person {
  UserName: string;
  FirstName: string;
  LastName: string;
  Emails?: string[];
  AddressInfo?: Location[];
  Gender?: PersonGender;
  Friends?: Person[];
  Trips?: Trip[];
  Photo?: Photo;
}
export const PersonConfig = {
  name: "Person",
  annotations: [],
  fields: {
    UserName: {type: 'String', key: true, ref: 'UserName', nullable: false, annotations: [{"type":"Org.OData.Core.V1.Permissions","permissions":["Org.OData.Core.V1.Permission/Read"]}]},
    FirstName: {type: 'String', nullable: false},
    LastName: {type: 'String', nullable: false},
    Emails: {type: 'String', collection: true},
    AddressInfo: {type: '${NAMESPACE}.Location', collection: true},
    Gender: {type: `${NAMESPACE}.PersonGender`},
    Concurrency: {type: 'Number', nullable: false, annotations: [{"type":"Org.OData.Core.V1.Computed","bool":true}]},
    Friends: {type: `${NAMESPACE}.Person`, collection: true, navigation: true},
    Trips: {type: `${NAMESPACE}.Trip`, collection: true, navigation: true},
    Photo: {type: `${NAMESPACE}.Photo`, navigation: true}
  }
} as EntityConfig<Person>;
//#endregion

//#region Services
@Injectable()
export class PeopleService extends ODataEntityService<Person> {
  static path: string = 'People';
  static type: string = `${NAMESPACE}.People`;
  static entity: string = `${NAMESPACE}.Person`;
}
export const PeopleServiceConfig = {
  name: "People",
} as ServiceConfig;
//#endregion

export const TripPinConfig = {
  serviceRootUrl: SERVICE_ROOT,
  schemas: [{
    namespace: `${NAMESPACE}`,
    enums: [ PersonGenderConfig ],
    entities: [
      PhotoConfig,
      PersonConfig,
      PlanItemConfig,
      TripConfig
    ],
    containers: [{
      services: [ PeopleServiceConfig ]
    }]
  }],
  parsers: {
    ...DATE_PARSER,
    ...DECIMAL_PARSER
  }
} as Configuration;