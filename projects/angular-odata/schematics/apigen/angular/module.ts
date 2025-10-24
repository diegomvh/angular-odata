import { strings } from '@angular-devkit/core';
import { Base } from './base';
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';
import { Service } from './service';
import { Package } from './package';

export class Module extends Base {
  services: Service[] = [];
  constructor(protected pkg: Package, options: ApiGenSchema) {
    super(pkg, options);
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
