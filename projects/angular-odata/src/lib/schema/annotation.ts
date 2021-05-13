import { AnnotationConfig } from '../types';

export class ODataAnnotation {
  type: string;
  string?: string;
  bool?: boolean;
  int?: number;
  permissions?: string[];
  properties?: string[];
  constructor(annot: AnnotationConfig) {
    this.type = annot.type;
    Object.assign(this, annot);
  }
}
