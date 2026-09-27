import { Injectable } from '@angular/core';
import { ODataClient } from './client';
import { EDM_PARSERS } from './schema';
import { ODataEntitySetService } from './services';
import { ODataApiConfig, ODataEnumTypeConfig } from './types';
import { ODataMetadata } from './metadata';
import * as json from './trippin.metadata.json';
import { Duration } from './utils';

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
} as ODataEnumTypeConfig;
//#endregion

//#region Entities
export interface Photo {
  Id: number;
  Name?: string;
}

export interface Airline {
  AirlineCode: string;
  Name: string;
}

export interface Airport {
  IcaoCode: string;
  Name: string;
  IataCode: string;
}

export interface PlanItem {
  PlanItemId: number;
  ConfirmationCode?: string;
  Description?: string;
  StartsAt?: Date;
  OccursAt?: any;
  EndsAt?: Date;
  Duration?: string | Duration;
}
export interface PublicTransportation extends PlanItem {
  SeatNumber?: string;
}

export interface Flight extends PublicTransportation {
  FlightNumber: string;
  From?: Airport;
  To?: Airport;
  Airline?: Airline;
}

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
//#endregion

//#region Services

export const TRIPPIN_CONFIG_NAME = 'TripPin';
export const TRIPPIN_SERVICE_ROOT = 'https://services.odata.org/v4/TripPinServiceRW/';
export const TRIPPIN_NAMESPACE = 'Microsoft.OData.SampleService.Models.TripPin';
@Injectable({ providedIn: 'root' })
export class PeopleService extends ODataEntitySetService<Person> {
  constructor(client: ODataClient) {
    super(client, 'People', `${TRIPPIN_NAMESPACE}.Person`);
  }
}
//#endregion

export const TripPinMetadata = ODataMetadata.fromJson(json);
export const TripPinConfig = TripPinMetadata.toConfig({
  name: TRIPPIN_CONFIG_NAME,
  serviceRootUrl: TRIPPIN_SERVICE_ROOT,
  options: {
    stringAsEnum: true,
    stripMetadata: 'full',
    fetchPolicy: 'no-cache',
    nonParenthesisForEmptyParameterFunction: true
  },
  schemas: [
    {
      namespace: `${TRIPPIN_NAMESPACE}`,
      enums: [FlagEnumsConfig],
    }
  ],
  parsers: EDM_PARSERS,
}) as ODataApiConfig;

export const CUSTOM_SERVICE_ROOT = 'https://services.odata.org/v4/TripPinServiceRW/';
export const CUSTOM_CONFIG_NAME = 'Custom';
export const CUSTOM_NAMESPACE = 'Custom';
export const CustomConfig = {
  name: CUSTOM_CONFIG_NAME,
  serviceRootUrl: CUSTOM_SERVICE_ROOT,
  options: {
    stringAsEnum: true,
    stripMetadata: 'full',
    fetchPolicy: 'no-cache',
    nonParenthesisForEmptyParameterFunction: true
  },
  schemas: [
    {
      namespace: `${CUSTOM_NAMESPACE}`,
      enums: [FlagEnumsConfig],
    }
  ],
  parsers: EDM_PARSERS,
} as ODataApiConfig;