import { Injectable } from '@angular/core';
import { ODataClient, 
  ODataActionResource, 
  ODataActionOptions, 
  ODataFunctionResource, 
  ODataFunctionOptions, 
  ODataEntitySetService, 
  ODataOptions,
  ODataBaseService,
  EntityKey } from 'angular-odata';<% for (let imp of imports) { %>
import { <%= imp.names.join(", ") %> } from '<%= imp.path() %>';<% } %>

@Injectable()
export class <%= classify(name) %> extends ODataBaseService {
  constructor(client: ODataClient) {
    super(client, '<%= name %>', '<%= type %>');
  }
}
