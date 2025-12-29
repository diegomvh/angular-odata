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
  ODataActionOptions,<% if (hasDurationFields) { %>
  Duration,<% } %>
} from 'angular-odata';
<% if (hasGeoFields) { %>import { <% for (let f of geoFields) { %><%= f.type() %>,<% } %> } from 'geojson';<% } %><% for (let imp of imports) { %>
import { <%= imp.resolve().join(", ") %> } from '<%= imp.path() %>';<% } %>

@Model()
export class <%= classify(name) %><E extends <%= entity.name() %>> extends <% if (baseType) { %><%= toTypescriptType(baseType) %><E><% } else { %>ODataModel<E><% } %> {
  <% for (let field of fields) { %>@ModelField()
  declare <%= field.name() %>: <%= field.type(imports) %>;
  <%= field.resource(imports) %><%= field.getter(imports) %><%= field.setter(imports) %><%= field.fetch(imports) %>
  <% } %>
  <% for (let cal of callables) { %>
  // <%= cal.name() %>
  <%= cal.callableMethod() %>
<% } %>
  <% for (let nav of navigations) { %><%= nav %>
  <% } %>
}