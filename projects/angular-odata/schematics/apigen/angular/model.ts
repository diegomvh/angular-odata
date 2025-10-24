import { strings } from '@angular-devkit/core';
import { Base } from './base';
import { CsdlComplexType, CsdlEntityType } from '../metadata/csdl/csdl-structured-type';
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';
import { CsdlNavigationProperty, CsdlProperty } from '../metadata/csdl/csdl-structural-property';
import { toTypescriptType } from '../utils';
import { Entity } from './entity';
import { Package } from './package';

export class ModelField {
  constructor(protected model: Model, protected edmType: CsdlProperty | CsdlNavigationProperty) {}

  name() {
    const required = !(this.edmType instanceof CsdlNavigationProperty || this.edmType.Nullable);
    const name = this.edmType.Name;
    return name + (!required ? '?' : '');
  }

  type() {
    const pkg = this.model.getPackage();
    const enumType = pkg.findEnum(this.edmType.Type);
    const entityType = pkg.findEntity(this.edmType.Type);
    let type = "any";
    if (enumType !== undefined)
    {
      type = enumType.importedName!;
      type += this.edmType.Collection ? '[]' : '';
    } else if (entityType !== undefined) {
      if (this.edmType.Collection) {
        const collection = pkg.findCollection(this.edmType.Type);
        const model = pkg.findModel(this.edmType.Type);
        type = `${collection!.importedName}<${entityType!.importedName}, ${model!.importedName}<${entityType!.importedName}>>`;
      } else {
        const model = pkg.findModel(this.edmType.Type);
        type = `${model!.importedName}<${entityType!.importedName}>`;
      }
    } else {
      type = toTypescriptType(this.edmType.Type);
      type += this.edmType.Collection ? '[]' : '';
    }
    return type;
  }

  resource() {
    const resourceName = `$$${this.edmType.Name}`;
    if (this.edmType instanceof CsdlNavigationProperty) { 
      const nav = this.edmType as CsdlNavigationProperty;
      return `public ${resourceName}() {
    return this.navigationProperty<${this.type()}>('${this.edmType.Name}');
  }`
    }
    else {
      return `public ${resourceName}() {
    return this.property<${this.type()}>('${this.edmType.Name}');
  }`
    }
  }

  getter() {
    const getterName = `$${this.edmType.Name}`;
    if (this.edmType instanceof CsdlNavigationProperty) { 
      const nav = this.edmType as CsdlNavigationProperty;
      return "";
    } else {
      return `public ${getterName}() {
    return this.getAttribute<${this.type()}>('${this.edmType.Name}') as ${this.type()};
  }`
    }
  }

  setter() {
    const setterName = `${this.edmType.Name}$$`;
    if (this.edmType instanceof CsdlNavigationProperty) { 
      const nav = this.edmType as CsdlNavigationProperty;
      return "";
    } else {
      return `public ${setterName}(model: ${this.type()} | null, options?: ODataOptions) {
    return this.setReference<${this.type()}>('${this.edmType.Name}', model, options);
  }`
    }
  }

  fetch() {
    const fetchName = `${this.edmType.Name}$`;
    if (this.edmType instanceof CsdlNavigationProperty) { 
      const nav = this.edmType as CsdlNavigationProperty;
      return "";
    } else {
      return `public ${fetchName}(options?: ODataQueryArgumentsOptions<${this.type()}>) {
    return this.fetchAttribute<${this.type()}>('${this.edmType.Name}', options) as Observable<${this.type()}>;
  }`
    }
  }
}

export class Model extends Base {
  constructor(
    pkg: Package,
    options: ApiGenSchema,
    protected edmType: CsdlEntityType | CsdlComplexType,
    protected entity: Entity
  ) {
    super(pkg, options);
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
        ...(this.edmType.Property ?? []).map((p) => new ModelField(this, p)),
        ...(this.edmType.NavigationProperty ?? []).map((p) => new ModelField(this, p)),
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
