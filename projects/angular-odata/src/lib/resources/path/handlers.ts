import { PathSegmentNames } from '../../types';
import { Types } from '../../utils';

import { EntityKey } from '../resource';
import type { ODataPathSegments, ODataSegment } from './segments';

export class SegmentHandler {
  constructor(private segment: ODataSegment) {}
  get name() {
    return this.segment.name;
  }
  type(value?: string) {
    if (value !== undefined) this.segment.type = value;
    return this.segment.type;
  }
  path(value?: string) {
    if (value !== undefined) this.segment.path = value;
    return this.segment.path;
  }
  key<T>(value?: EntityKey<T>) {
    if (value !== undefined) this.segment.key = value;
    return this.segment.key as EntityKey<T>;
  }
  hasKey() {
    return !Types.isEmpty(this.segment.key);
  }
  clearKey() {
    delete this.segment.key;
  }
  parameters<T>(value?: T) {
    if (value !== undefined) this.segment.parameters = value;
    return this.segment.parameters as T;
  }
  hasParameters() {
    return !Types.isEmpty(this.segment.parameters);
  }
  clearParameters() {
    delete this.segment.parameters;
  }
}

export class ODataPathSegmentsHandler<T> {
  constructor(protected segments: ODataPathSegments) {}
  entitySet() {
    return this.segments.get(PathSegmentNames.entitySet);
  }
  singleton() {
    return this.segments.get(PathSegmentNames.singleton);
  }
  action() {
    return this.segments.get(PathSegmentNames.action);
  }
  function() {
    return this.segments.get(PathSegmentNames.function);
  }
  keys(values?: (EntityKey<T> | undefined)[]) {
    return this.segments.keys(values);
  }
  property() {
    return this.segments.get(PathSegmentNames.property);
  }
  navigationProperty() {
    return this.segments.get(PathSegmentNames.navigationProperty);
  }
}
