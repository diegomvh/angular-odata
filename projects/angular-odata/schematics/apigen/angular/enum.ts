import { CsdlEnumType, CsdlMember } from '../metadata/csdl/csdl-enum-type';
import { strings } from '@angular-devkit/core';
import { Base } from './base';
import { Import } from './import';
import { url, Source } from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from '../schema';
import { Package } from './package';

export class EnumValue {
  constructor(private edmType: CsdlMember) {}
  public name() {
    return this.edmType.Name;
  }
  public value() {
    return this.edmType.Value;
  }
}
export class Enum extends Base {
  constructor(
    pkg: Package,
    options: ApiGenSchema,
    protected edmType: CsdlEnumType,
  ) {
    super(pkg, options);
  }
  public override template(): Source {
    return url('./files/enum');
  }
  public override variables(): { [name: string]: any } {
    return {
      type: this.name() + 'EnumType',
      values: (this.edmType.Member ?? []).map((m) => new EnumValue(m)),
    };
  }
  public override name() {
    return strings.classify(this.edmType.name());
  }
  public override fileName() {
    return strings.dasherize(this.edmType.name()) + '.enum';
  }
  public override directory() {
    return this.edmType.namespace().replace(/\./g, '/');
  }
  public override fullName() {
    return this.edmType.fullName();
  }
  public members() {
    return this.edmType.Member.map((m) => `${m.Name} = ${m.Value}`);
  }
  public flags() {
    return this.edmType.IsFlags;
  }
  public override importTypes(): string[] {
    return [];
  }
}
