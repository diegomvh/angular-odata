import { ODataAnnotationConfig } from '../types';

export class ODataAnnotation {
  term: string;
  string?: string;
  bool?: boolean;
  int?: number;
  permissions?: string[];
  properties?: string[];

  constructor(annot: ODataAnnotationConfig) {
    this.term = annot.term;
    Object.assign(this, annot);
  }
}

export class ODataAnnotatable {
  annotations: ODataAnnotation[];
  constructor(config: { annotations?: ODataAnnotationConfig[] }) {
    this.annotations = (config.annotations || []).map((annot) => new ODataAnnotation(annot));
  }

  /**
   * Find an annotation inside the annotatable.
   * @param predicate Function that returns true if the annotation match.
   * @returns The annotation that matches the predicate.
   */
  findAnnotation(predicate: (annot: ODataAnnotation) => boolean) {
    return this.annotations.find(predicate);
  }

  /**
   * Find an annotation inside the annotatable and return its value.
   * @param term The term of the annotation to find.
   * @returns The value of the annotation.
   */
  annotatedValue<T>(term: string | RegExp): T | undefined {
    const reg = term instanceof RegExp ? term : new RegExp(`^${term}$`);
    const annot = this.findAnnotation((a) => reg.test(a.term));
    if (!annot) {
      return undefined;
    }
    return (annot.string ||
      annot.bool ||
      annot.int ||
      annot.permissions ||
      annot.properties) as any;
  }
}
