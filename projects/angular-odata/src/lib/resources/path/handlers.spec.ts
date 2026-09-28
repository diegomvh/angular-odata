import { ODataPathSegments } from './segments';
import { ODataPathSegmentsHandler, SegmentHandler } from './handlers';
import { PathSegment } from '../../types';

describe('SegmentHandler', () => {
  it('should expose the segment name', () => {
    const segments = new ODataPathSegments([{ name: PathSegment.entitySet, path: 'People' }]);
    expect(segments.get(PathSegment.entitySet).name).toBe(PathSegment.entitySet);
  });

  it('should get and set the outgoing type', () => {
    const segments = new ODataPathSegments([{ name: PathSegment.entitySet, path: 'People' }]);
    const handler = segments.get(PathSegment.entitySet);
    expect(handler.outgoingType()).toBeUndefined();
    expect(handler.outgoingType('TripPin.Person')).toBe('TripPin.Person');
    expect(handler.outgoingType()).toBe('TripPin.Person');
  });

  it('should get and set the incoming type', () => {
    const segments = new ODataPathSegments([{ name: PathSegment.entitySet, path: 'People' }]);
    const handler = segments.get(PathSegment.entitySet);
    expect(handler.incomingType()).toBeUndefined();
    expect(handler.incomingType('TripPin.Person')).toBe('TripPin.Person');
  });

  it('should get and set the binding type', () => {
    const segments = new ODataPathSegments([{ name: PathSegment.entitySet, path: 'People' }]);
    const handler = segments.get(PathSegment.entitySet);
    expect(handler.bindingType()).toBeUndefined();
    expect(handler.bindingType('TripPin.Person')).toBe('TripPin.Person');
  });

  it('should get and set the path', () => {
    const segments = new ODataPathSegments([{ name: PathSegment.entitySet, path: 'People' }]);
    const handler = segments.get(PathSegment.entitySet);
    expect(handler.path('People(1)')).toBe('People(1)');
    expect(handler.path()).toBe('People(1)');
  });

  it('should get, set, check and clear the key', () => {
    const segments = new ODataPathSegments([{ name: PathSegment.entitySet, path: 'People' }]);
    const handler = segments.get(PathSegment.entitySet);
    expect(handler.hasKey()).toBe(false);
    expect(handler.key(1)).toBe(1);
    expect(handler.hasKey()).toBe(true);
    expect(handler.key()).toBe(1);
    handler.clearKey();
    expect(handler.hasKey()).toBe(false);
  });

  it('should get, set, check and clear the parameters', () => {
    const segments = new ODataPathSegments([{ name: PathSegment.function, path: 'GetPeople' }]);
    const handler = segments.get(PathSegment.function);
    expect(handler.hasParameters()).toBe(false);
    expect(handler.parameters({ p: 1 })).toEqual({ p: 1 });
    expect(handler.hasParameters()).toBe(true);
    expect(handler.parameters()).toEqual({ p: 1 });
    handler.clearParameters();
    expect(handler.hasParameters()).toBe(false);
  });
});

describe('ODataPathSegmentsHandler', () => {
  const build = () =>
    new ODataPathSegmentsHandler(
      new ODataPathSegments([
        { name: PathSegment.entitySet, path: 'People' },
        { name: PathSegment.navigationProperty, path: 'Trips' },
        { name: PathSegment.singleton, path: 'Me' },
      ]),
    );

  it('should resolve the entitySet segment', () => {
    expect(build().entitySet().name).toBe(PathSegment.entitySet);
  });

  it('should resolve the navigationProperty segment', () => {
    expect(build().navigationProperty().name).toBe(PathSegment.navigationProperty);
  });

  it('should resolve the singleton segment', () => {
    expect(build().singleton().name).toBe(PathSegment.singleton);
  });

  it('should return the keys of the key-bearing segments', () => {
    const handler = build();
    expect(handler.keys()).toEqual([undefined, undefined]);
  });

  it('should set the keys of the key-bearing segments', () => {
    const handler = build();
    expect(handler.keys([1, 2])).toEqual([1, 2]);
    expect(handler.entitySet().key()).toBe(1);
    expect(handler.navigationProperty().key()).toBe(2);
  });

  it('should clear a key when given undefined', () => {
    const handler = build();
    expect(handler.keys([1, undefined])).toEqual([1, undefined]);
    expect(handler.entitySet().key()).toBe(1);
    expect(handler.navigationProperty().key()).toBeUndefined();
  });

  it('should throw when no action segment exists', () => {
    expect(() => build().action()).toThrowError('No Segment for name action was found');
  });

  it('should throw when no function segment exists', () => {
    expect(() => build().function()).toThrowError('No Segment for name function was found');
  });

  it('should throw when no property segment exists', () => {
    expect(() => build().property()).toThrowError('No Segment for name property was found');
  });
});
