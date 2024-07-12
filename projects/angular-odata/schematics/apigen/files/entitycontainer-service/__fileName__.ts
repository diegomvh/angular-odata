import { Injectable } from '@angular/core';
import { ODataClient, ODataBaseService } from 'angular-odata';<% for (let imp of imports) { %>
import { <%= imp.names.join(", ") %> } from '<%= imp.path() %>';<% } %>

@Injectable()
export class <%= classify(name) %> extends ODataBaseService {
  constructor(client: ODataClient) {
    super(client, '<%= name %>', '<%= type %>');
  }
}
