import { CsdlAnnotable, CsdlAnnotation } from './csdl-annotation';

export class CsdlReference extends CsdlAnnotable {
    constructor(
        public uri: string,
        public includes?: CsdlInclude[],
        public includeAnnotations?: CsdlIncludeAnnotations[],
        annotationList?: CsdlAnnotation[]
    ) {
        super(annotationList);
    }
}

export class CsdlInclude {
    constructor(
        public namespace: string,
        public alias?: string
    ) { }
}

export class CsdlIncludeAnnotations {
    constructor(
        public termNamespace: string,
        public qualifier?: string,
        public targetNamespace?: string
    ) { }
}
