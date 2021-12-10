import { CALLABLE_BINDING_PARAMETER } from '../constants';
import { CallableConfig } from '../types';
import { Objects } from './objects';

export const OData = {
  // Merge callables parameters
  mergeCallableParameters(callables: CallableConfig[]): CallableConfig[] {
    const areEqual = (a: CallableConfig, b: CallableConfig) =>
      a.name === b.name &&
      Objects.equal(
        (a.parameters || {})[CALLABLE_BINDING_PARAMETER] || {},
        (b.parameters || {})[CALLABLE_BINDING_PARAMETER] || {}
      );
    return callables.reduce((acc: CallableConfig[], config) => {
      if (acc.every((c) => !areEqual(c, config))) {
        config = callables
          .filter((c) => areEqual(c, config))
          .reduce((acc, c) => {
            acc.parameters = Object.assign(
              acc.parameters || {},
              c.parameters || {}
            );
            return acc;
          }, config);
        return [...acc, config];
      }
      return acc;
    }, [] as CallableConfig[]);
  },
};
