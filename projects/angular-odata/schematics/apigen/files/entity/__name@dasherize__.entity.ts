import { Duration } from 'angular-odata';

export interface <%= classify(name) %> {<% for(let property of properties) { %>
  <%= property.name %>: <%= toTypescriptType(property.type) %>;<% } %>
}