import { strings } from '@angular-devkit/core';
import { Base } from './base';
import { CsdlEntityContainer } from '../metadata/csdl/csdl-entity-container';
import { CsdlSingleton } from '../metadata/csdl/csdl-singleton';
import { CsdlEntitySet } from '../metadata/csdl/csdl-entity-set';
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';
import { Package } from './package';

export class Service extends Base {
  constructor(
    pkg: Package,
    options: ApiGenSchema,
    protected edmElement: CsdlEntitySet | CsdlEntityContainer | CsdlSingleton,
  ) {
    super(pkg, options);
  }
  public override template(): Source {
    return this.edmElement instanceof CsdlEntitySet
      ? url('./files/entityset-service')
      : this.edmElement instanceof CsdlSingleton
        ? url('./files/singleton-service')
        : url('./files/entitycontainer-service');
  }
  public override variables(): { [name: string]: any } {
    return {
      path: this.edmElement.name(),
      type:
        this.edmElement instanceof CsdlEntitySet
          ? this.edmElement.EntityType
          : this.edmElement instanceof CsdlSingleton
            ? this.edmElement.Type
            : this.options.name,
      callables: this.callables ?? [],
    };
  }
  public entityType() {
    return this.edmElement instanceof CsdlEntitySet
      ? this.edmElement.EntityType
      : this.edmElement instanceof CsdlSingleton
        ? this.edmElement.Type
        : '';
  }

  public override name() {
    return strings.classify(this.edmElement.name()) + 'Service';
  }
  public override fileName() {
    return strings.dasherize(this.edmElement.name()) + '.service';
  }
  public override directory() {
    return this.edmElement.namespace().replace(/\./g, '/');
  }
  public override fullName() {
    return this.edmElement.fullName();
  }
  public override importTypes(): string[] {
    const imports = [];
    if (this.edmElement instanceof CsdlEntitySet) {
      imports.push(this.edmElement.EntityType);
    } else if (this.edmElement instanceof CsdlSingleton) {
      imports.push(this.edmElement.Type);
    }
    for (var call of this.callables ?? []) {
      const ret = call.returnType();
      if (ret !== undefined && !ret.Type.startsWith('Edm.')) {
        imports.push(ret.Type);
      }
      const { binding, required, optional } = call.parameters();
      for (let param of [...required, ...optional]) {
        if (!param.Type.startsWith('Edm.')) {
          imports.push(param.Type);
        }
      }
    }
    return imports;
  }
}
