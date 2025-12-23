import { Injectable } from '@angular/core';
import { ODataClient, 
  ODataActionResource, 
  ODataActionOptions, 
  ODataFunctionResource, 
  ODataFunctionOptions, 
  ODataEntitySetService, 
  ODataOptions,
  EntityKey } from 'angular-odata';<% for (let imp of imports) { %>
import { <%= imp.resolve().join(", ") %> } from '<%= imp.path() %>';<% } %>

@Injectable()
export class <%= classify(name) %> extends ODataEntitySetService<<%= toTypescriptType(type) %>> {
  constructor(client: ODataClient) {
    super(client, '<%= path %>', '<%= type %>');
  }
  <%= camelize(toTypescriptType(type)) %>Model(entity?: Partial<<%= toTypescriptType(type) %>>) {
    return this.model(entity);
  }
  <%= camelize(toTypescriptType(type)) %>Collection(entities?: Partial<<%= toTypescriptType(type) %>>[]) {
    return this.collection(entities);
  }<% for (let cal of callables) { %>
  // <%= cal.name() %>
  <%= cal.resourceFunction() %>
  <%= cal.callableFunction() %>
<% } %>
}
