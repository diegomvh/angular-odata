import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  Model,
  ModelField,
  ODataModel,
  ODataCollection,
  ODataOptions,
  ODataQueryArgumentsOptions,
  ODataFunctionOptions,
  ODataActionOptions,
  Duration,
} from 'angular-odata';<% for (let imp of imports) { %>
import { <%= imp.names.join(", ") %> } from '<%= imp.path() %>';<% } %>

@Model()
export class <%= classify(name) %><E extends <%= entity.name() %>> extends <% if (baseType) { %><%= toTypescriptType(baseType) %><E><% } else { %>ODataModel<E><% } %> {
  <% for (let field of fields) { %>@ModelField()
  <%= field.name() %>: <%= field.type() %>;
  <%= field.resource() %>
  <%= field.getter() %>
  <%= field.setter() %>
  <%= field.fetch() %>
  <% } %>
  <% for (let action of actions) { %><%= action %>
  <% } %>
  <% for (let func of functions) { %><%= func %>
  <% } %>
  <% for (let nav of navigations) { %><%= nav %>
  <% } %>
}