import { strings } from '@angular-devkit/core';
import { Base } from './base';
import { CsdlComplexType, CsdlEntityType } from '../metadata/csdl/csdl-structured-type';
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';
import { Model } from './model';
import { Entity } from './entity';
import { Package } from './package';
import { Import } from './import';

export class Collection extends Base {
  constructor(
    pkg: Package,
    options: ApiGenSchema,
    protected edmType: CsdlEntityType | CsdlComplexType,
    protected entity: Entity,
    protected model: Model,
  ) {
    super(pkg, options);
  }

  public entityType() {
    return this.edmType.fullName();
  }

  public override template(): Source {
    return url('./files/collection');
  }
  public override variables(imports: Import[]): { [name: string]: any } {
    return {
      type: this.name() + 'Collection',
      baseType: this.edmType.BaseType ? this.edmType.BaseType + 'Collection' : null,
      entity: this.entity,
      model: this.model,
      callables: this.callables ?? [],
      functions: [],
    };
  }
  public override name() {
    return strings.classify(this.edmType.name()) + 'Collection';
  }
  public override fileName() {
    return strings.dasherize(this.edmType.name()) + '.collection';
  }
  public override directory() {
    return this.edmType.namespace().replace(/\./g, '/');
  }
  public override fullName() {
    return this.edmType.fullName() + 'Collection';
  }
  public override importTypes(): string[] {
    const imports = [this.entity.fullName(), this.model.fullName()];
    if (this.edmType.BaseType) {
      imports.push(this.edmType.BaseType);
      imports.push(this.edmType.BaseType + 'Collection');
      imports.push(this.edmType.BaseType + 'Model');
    }
    for (let prop of this.edmType?.Property ?? []) {
      if (!prop.Type.startsWith('Edm.')) {
        imports.push(prop.Type);
        imports.push(prop.Type + 'Model');
        if (prop.Collection) {
          imports.push(prop.Type + 'Collection');
        }
      }
    }
    for (let prop of this.edmType?.NavigationProperty ?? []) {
      if (!prop.Type.startsWith('Edm.')) {
        imports.push(prop.Type);
        imports.push(prop.Type + 'Model');
        if (prop.Collection) {
          imports.push(prop.Type + 'Collection');
        }
      }
    }
    for (let callable of this.callables ?? []) {
      imports.push(...callable.importTypes());
    }
    return imports;
  }
}
