import { ODataApi } from '../api';
import { ParserOptions, ODataReferenceConfig } from '../types';
import { ODataAnnotatable } from './annotation';

export class ODataInclude {
  namespace: string;
  alias?: string;
  reference: ODataReference;
  constructor(config: {namespace: string, alias?: string}, reference: ODataReference) {
    this.namespace = config.namespace;
    this.alias = config.alias;
    this.reference = reference;
  }

  configure({ options }: { options: ParserOptions }) {
  }
}

export class ODataIncludeAnnotation {
  termNamespace: string;
  qualifier?: string;
  targetNamespace?: string;
  reference: ODataReference;
  constructor(config: {termNamespace: string, qualifier?: string, targetNamespace?: string}, reference: ODataReference) {
    this.termNamespace = config.termNamespace; 
    this.qualifier = config.qualifier;
    this.targetNamespace = config.targetNamespace;
    this.reference = reference;
  }

  configure({ options }: { options: ParserOptions }) {
  }
}

export class ODataReference extends ODataAnnotatable {
  api: ODataApi;
  uri: string;
  includes: ODataInclude[]
  includeAnnotations: ODataIncludeAnnotation[]

  constructor(config: ODataReferenceConfig, api: ODataApi) {
    super(config);
    this.api = api;
    this.uri = config.uri;
    this.includes = (config.includes ?? []).map((config) => new ODataInclude(config, this));
    this.includeAnnotations = (config.includeAnnotations ?? []).map((config) => new ODataIncludeAnnotation(config, this));
  }

  configure({ options }: { options: ParserOptions }) {
    // Configure Includes
    this.includes.forEach((include) => include.configure({ options }));
    // Configure IncludeAnnotations
    this.includeAnnotations.forEach((includeAnnotation) => includeAnnotation.configure({ options }));
  }
}
