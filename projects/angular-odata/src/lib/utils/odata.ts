import { CALLABLE_BINDING_PARAMETER } from '../constants';
import { CallableConfig } from '../types';
import { Objects } from './objects';

export const OData = {
  // Merge callables parameters
  mergeCallableParameters(callables: CallableConfig[]): CallableConfig[] {
    return callables.reduce((acc: CallableConfig[], config) => {
      if (acc.every((c) => c.name !== config.name)) {
        config = callables
          .filter(
            (c) =>
              c.name === config.name &&
              Objects.equal(
                (c.parameters || {})[CALLABLE_BINDING_PARAMETER] || {},
                (config.parameters || {})[CALLABLE_BINDING_PARAMETER] || {}
              )
          )
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
