import { ODataPathSegments, PathSegmentNames } from './path-segments';
import { $BATCH, $METADATA, $REF, $VALUE, $COUNT } from '../constants';

const ENTITY_SET = 'People';
const SINGLETON = 'Me';
const TYPE = 'Microsoft.OData.SampleService.Models.TripPin.Person';
const NAVIGATION_PROPERTY = 'Friends';
const PROPERTY = 'Photo';
const FUNCTION = 'GetFavoriteAirline';
const ACTION = 'ResetDataSource';

describe('ODataPathSegments', () => {
  it('test batch', () => {
    const pathSegments: ODataPathSegments = new ODataPathSegments();
    pathSegments.segment(PathSegmentNames.batch, $BATCH);
    expect(pathSegments.toString()).toEqual('$batch');
  });

  it('test metadata', () => {
    const pathSegments: ODataPathSegments = new ODataPathSegments();
    pathSegments.segment(PathSegmentNames.metadata, $METADATA);
    expect(pathSegments.toString()).toEqual('$metadata');
  });

  it('test entitySet', () => {
    const pathSegments: ODataPathSegments = new ODataPathSegments();
    pathSegments.segment(PathSegmentNames.entitySet, ENTITY_SET);
    expect(pathSegments.toString()).toEqual('People');
  });

  it('test singleton', () => {
    const pathSegments: ODataPathSegments = new ODataPathSegments();
    pathSegments.segment(PathSegmentNames.singleton, SINGLETON);
    expect(pathSegments.toString()).toEqual('Me');
  });

  it('test type', () => {
    const pathSegments: ODataPathSegments = new ODataPathSegments();
    pathSegments.segment(PathSegmentNames.type, TYPE);
    expect(pathSegments.toString()).toEqual('Microsoft.OData.SampleService.Models.TripPin.Person');
  });

  it('test property', () => {
    const pathSegments: ODataPathSegments = new ODataPathSegments();
    pathSegments.segment(PathSegmentNames.property, PROPERTY);
    expect(pathSegments.toString()).toEqual('Photo');
  });

  it('test navigationProperty', () => {
    const pathSegments: ODataPathSegments = new ODataPathSegments();
    pathSegments.segment(PathSegmentNames.navigationProperty, NAVIGATION_PROPERTY);
    expect(pathSegments.toString()).toEqual('Friends');
  });

  it('test reference', () => {
    const pathSegments: ODataPathSegments = new ODataPathSegments();
    pathSegments.segment(PathSegmentNames.reference, $REF);
    expect(pathSegments.toString()).toEqual('$ref');
  });

  it('test value', () => {
    const pathSegments: ODataPathSegments = new ODataPathSegments();
    pathSegments.segment(PathSegmentNames.value, $VALUE);
    expect(pathSegments.toString()).toEqual('$value');
  });

  it('test count', () => {
    const pathSegments: ODataPathSegments = new ODataPathSegments();
    pathSegments.segment(PathSegmentNames.count, $COUNT);
    expect(pathSegments.toString()).toEqual('$count');
  });

  it('test function', () => {
    const pathSegments: ODataPathSegments = new ODataPathSegments();
    pathSegments.segment(PathSegmentNames.function, FUNCTION);
    expect(pathSegments.toString()).toEqual('GetFavoriteAirline');
  });

  it('test action', () => {
    const pathSegments: ODataPathSegments = new ODataPathSegments();
    pathSegments.segment(PathSegmentNames.action, ACTION);
    expect(pathSegments.toString()).toEqual('ResetDataSource');
  });

});
