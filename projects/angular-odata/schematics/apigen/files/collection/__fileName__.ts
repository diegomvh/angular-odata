import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  ODataModel,
  ODataCollection,
  ODataOptions,
  ODataQueryArgumentsOptions,
  ODataFunctionOptions,
  ODataActionOptions
} from 'angular-odata';<% for (let imp of imports) { %>
import { <%= imp.names.join(", ") %> } from '<%= imp.path() %>';<% } %>

export class <%= classify(name) %><E extends <%= entity.name() %>, M extends <%= model.name() %><E>> extends <% if (baseType) { %><%= toTypescriptType(baseType) %><E, M><% } else { %>ODataCollection<E, M><% } %> {
  <% for (let cal of callables) { %>
  // <%= cal.name() %>
  <%= cal.callableMethod() %>
<% } %>
}
