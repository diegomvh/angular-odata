import { Duration } from 'angular-odata';
<% if (hasGeoProperties) { %>import { <% for (let p of geoProperties) { %><%= p.type() %>,<% } %> } from 'geojson';<% } %><% for (let imp of imports) { %>
import { <%= imp.resolve().join(", ") %> } from '<%= imp.path() %>';<% } %>

export const <%= type %> = '<%= fullName %>';
export interface <%= classify(name) %><% if (baseType) { %> extends <%= toTypescriptType(baseType) %><% } %> {<% for(let prop of properties) { %>
  <%= prop.name() %>: <%= prop.type() %>;<% } %>
}
