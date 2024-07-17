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
}

export class CsdlInclude {
  Namespace: string;
  Alias?: string;
  constructor({ Namespace, Alias }: { Namespace: string; Alias?: string }) {
    this.Namespace = Namespace;
    this.Alias = Alias;
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
}
