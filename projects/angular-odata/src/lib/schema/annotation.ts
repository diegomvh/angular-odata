import { AnnotationConfig } from '../types';

export class ODataAnnotation {
  term: string;
  string?: string;
  bool?: boolean;
  int?: number;
  permissions?: string[];
  properties?: string[];
  constructor(annot: AnnotationConfig) {
    this.term = annot.term;
    Object.assign(this, annot);
  }
}
