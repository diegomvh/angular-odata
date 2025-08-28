import { CALLABLE_BINDING_PARAMETER } from '../constants';
import { ODataCallableConfig } from '../types';
import { Objects } from './objects';

export const OData = {
  // Merge callables parameters
  mergeCallableParameters(callables: ODataCallableConfig[]): ODataCallableConfig[] {
    const areEqual = (a: ODataCallableConfig, b: ODataCallableConfig) =>
      a.name === b.name &&
      Objects.equal(
        (a.parameters || {})[CALLABLE_BINDING_PARAMETER] || {},
        (b.parameters || {})[CALLABLE_BINDING_PARAMETER] || {},
      );
    return callables.reduce((acc: ODataCallableConfig[], config) => {
      if (acc.every((c) => !areEqual(c, config))) {
        config = callables
          .filter((c) => areEqual(c, config))
          .reduce((acc, c) => {
            acc.parameters = Object.assign(acc.parameters || {}, c.parameters || {});
            return acc;
          }, config);
        return [...acc, config];
      }
      return acc;
    }, [] as ODataCallableConfig[]);
  },
};
