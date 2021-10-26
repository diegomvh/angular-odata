import { raw, buildPathAndQuery } from '../query';

import { Types } from '../../utils';

import { EntityKey } from '../resource';
import type { ODataSegment } from './segments';

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
