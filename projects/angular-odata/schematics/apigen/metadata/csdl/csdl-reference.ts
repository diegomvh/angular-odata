import { CsdlAnnotable } from './csdl-annotation';

export class CsdlReference extends CsdlAnnotable {
  Uri: string;
  Includes?: CsdlInclude[];
  IncludeAnnotations?: CsdlIncludeAnnotations[];
  constructor({
    Uri,
    Includes,
    IncludeAnnotations,
    Annotation,
  }: {
    Uri: string;
    Includes?: any[];
    IncludeAnnotations?: any[];
    Annotation?: any[];
  }) {
    super({ Annotation });
    this.Uri = Uri;
    this.Includes = Includes?.map((i) => new CsdlInclude(i));
    this.IncludeAnnotations = IncludeAnnotations?.map(
      (i) => new CsdlIncludeAnnotations(i),
    );
  }

  override toJson() {
    const json: {[key: string]: any} = {...super.toJson(), Uri: this.Uri};
    if (Array.isArray(this.Includes) && this.Includes.length) {
      json['Includes'] = this.Includes.map((i) => i.toJson());
    }
    if (Array.isArray(this.IncludeAnnotations) && this.IncludeAnnotations.length) {
      json['IncludeAnnotations'] = this.IncludeAnnotations.map((i) => i.toJson());
    }
    return json;
  }
}

export class CsdlInclude {
  Namespace: string;
  Alias?: string;
  constructor({ Namespace, Alias }: { Namespace: string; Alias?: string }) {
    this.Namespace = Namespace;
    this.Alias = Alias;
  }

  toJson() {
    return {
      Namespace: this.Namespace,
      Alias: this.Alias,
    };
  }
}

export class CsdlIncludeAnnotations {
  TermNamespace: string;
  Qualifier?: string;
  TargetNamespace?: string;
  constructor({
    TermNamespace,
    Qualifier,
    TargetNamespace,
  }: {
    TermNamespace: string;
    Qualifier?: string;
    TargetNamespace?: string;
  }) {
    this.TermNamespace = TermNamespace;
    this.Qualifier = Qualifier;
    this.TargetNamespace = TargetNamespace;
  }

  toJson() {
    return {
      TermNamespace: this.TermNamespace,
      Qualifier: this.Qualifier,
      TargetNamespace: this.TargetNamespace,
    };
  }
}