import { PathSegment } from '../../types';
import { Types } from '../../utils';
import { EntityKey } from '../resource';
import type { ODataPathSegments, ODataSegment } from './segments';

export class SegmentHandler {
  constructor(private segment: ODataSegment) {}
  get name() {
    return this.segment.name;
  }
  outgoingType(value?: string) {
    if (value !== undefined) this.segment.outgoingType = value;
    return this.segment.outgoingType;
  }
  incomingType(value?: string) {
    if (value !== undefined) this.segment.incomingType = value;
    return this.segment.incomingType;
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
    return this.segments.get(PathSegment.entitySet);
  }
  singleton() {
    return this.segments.get(PathSegment.singleton);
  }
  action() {
    return this.segments.get(PathSegment.action);
  }
  function() {
    return this.segments.get(PathSegment.function);
  }
  keys(values?: (EntityKey<T> | undefined)[]) {
    return this.segments.keys(values);
  }
  property() {
    return this.segments.get(PathSegment.property);
  }
  navigationProperty() {
    return this.segments.get(PathSegment.navigationProperty);
  }
}
