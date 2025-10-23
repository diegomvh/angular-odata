import { strings } from '@angular-devkit/core';
import { Base } from './base';
import { CsdlComplexType, CsdlEntityType } from '../metadata/csdl/csdl-structured-type';
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';
import { CsdlNavigationProperty, CsdlProperty } from '../metadata/csdl/csdl-structural-property';
import { toTypescriptType } from '../utils';
import { Entity } from './entity';

export class ModelField {
  constructor(protected edmType: CsdlProperty | CsdlNavigationProperty) {}

  name() {
    return this.edmType.Name;
  }

  type() {
    let type = toTypescriptType(this.edmType.Type);
    type += this.edmType.Collection ? '[]' : '';
    type += this.edmType.Nullable ? ' | null' : '';
    return type;
  }

  resource() {
    return "";
  }

  getter() {
    return "";
  }

  setter() {
    return "";
  }

  fetch() {
    return "";
  }
}

export class Model extends Base {
  constructor(
    options: ApiGenSchema,
    protected edmType: CsdlEntityType | CsdlComplexType,
    protected entity: Entity
  ) {
    super(options);
  }

  public entityType() {
    return this.edmType.fullName();
  }

  public override template(): Source {
    return url('./files/model');
  }
  public override variables(): { [name: string]: any } {
    return {
      type: this.name() + 'Model',
      baseType: this.edmType.BaseType ? this.edmType.BaseType + 'Model' : null,
      entity: this.entity,
      fields: [
        ...(this.edmType.Property ?? []).map((p) => new ModelField(p)),
        ...(this.edmType.NavigationProperty ?? []).map((p) => new ModelField(p)),
      ],
      actions: [], // To be implemented
      functions: [], // To be implemented
      navigations: [], // To be implemented
    };
  }
  public override name() {
    return strings.classify(this.edmType.name()) + "Model";
  }
  public override fileName() {
    return (
      strings.dasherize(this.edmType.name()) + '.model'
    );
  }
  public override directory() {
    return this.edmType.namespace().replace(/\./g, '/');
  }
  public override fullName() {
    return this.edmType.fullName() + "Model";
  }
  public override importTypes(): string[] {
    const imports = [
      this.entity.fullName()
    ];
    if (this.edmType.BaseType) {
      imports.push(this.edmType.BaseType);
      imports.push(this.edmType.BaseType + 'Model');
    }
    for (let prop of this.edmType?.Property ?? []) {
      if (!prop.Type.startsWith('Edm.')) {
        imports.push(prop.Type);
      }
    }
    for (let prop of this.edmType?.NavigationProperty ?? []) {
      if (!prop.Type.startsWith('Edm.')) {
        imports.push(prop.Type);
      }
    }
    return imports;
  }
}
