import { strings } from '@angular-devkit/core';
import { Base } from './base';
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';
import { Package } from './package';

export class ApiConfig extends Base {
  constructor(pkg: Package, options: ApiGenSchema) {
    super(pkg, options);
  }
  public override template(): Source {
    return url('./files/api-config');
  }
  public override variables(): { [name: string]: any } {
    return {
      serviceRootUrl: this.options.serviceRootUrl,
      metadataUrl: this.options.metadata,
      apiConfigName: this.options.name,
      version: this.options.version,
      creation: this.options.creation,
    };
  }
  public override name() {
    return strings.classify(this.options.name) + 'Config';
  }
  public override fileName() {
    return strings.dasherize(this.options.name) + '.config';
  }
  public override directory() {
    return '';
  }
  public override fullName() {
    return this.name();
  }
  public override importTypes(): string[] {
    return [];
  }
}
