import { Injectable } from '@angular/core';
import { ODataClient, ODataEntitySetService } from 'angular-odata';<% for (let imp of imports) { %>
import { <%= imp.names.join(", ") %> } from '<%= imp.path() %>';<% } %>

@Injectable()
export class <%= classify(name) %> extends ODataEntitySetService<<%= toTypescriptType(type) %>> {
  constructor(client: ODataClient) {
    super(client, '<%= name %>', '<%= type %>');
  }
  <%= camelize(toTypescriptType(type)) %>Model(entity?: Partial<<%= toTypescriptType(type) %>>) {
    return this.entity().asModel(entity);
  }
  <%= camelize(toTypescriptType(type)) %>Collection(entities?: Partial<<%= toTypescriptType(type) %>>[]) {
    return this.entities().asCollection(entities);
  }
}
