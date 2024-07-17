import { strings } from '@angular-devkit/core';
import { Base } from './base';
import { Import } from './import';
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';
import { Service } from './service';

export class Module extends Base {
  services: Service[] = [];
  constructor(options: ApiGenSchema) {
    super(options);
  }
  public override template(): Source {
    return url('./files/module');
  }
  public override variables(): { [name: string]: any } {
    return {
      services: this.services,
    };
  }
  public addService(service: Service) {
    this.services.push(service);
    this.addDependency(service);
  }
  public override name() {
    return strings.classify(this.options.name) + 'Module';
  }
  public override fileName() {
    return strings.dasherize(this.options.name) + '.module';
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
