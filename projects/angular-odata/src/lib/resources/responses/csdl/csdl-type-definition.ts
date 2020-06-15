import { CsdlAnnotable, CsdlAnnotation } from './csdl-annotation';

export class CsdlTypeDefinition extends CsdlAnnotable {
    constructor(
        public name: string,
        public underlayingType: string,
        public maxLength?: number,
        public precision?: number,
        public scale?: number,
        public unicode?: boolean,
        public srid?: string,
        annotationList?: CsdlAnnotation[]) {
        super(annotationList);
    }
}
