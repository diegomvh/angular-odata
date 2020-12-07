import { AnnotationConfig } from '../types';

export class ODataAnnotation {
  type: string;
  constructor(annot: AnnotationConfig) {
    this.type = annot.type;
    Object.assign(this, annot);
  }
}
