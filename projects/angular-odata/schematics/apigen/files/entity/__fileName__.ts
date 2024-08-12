import { Duration } from 'angular-odata';<% for (let imp of imports) { %>
import { <%= imp.names.join(", ") %> } from '<%= imp.path() %>';<% } %>

export const <%= type %> = '<%= fullName %>';
export interface <%= classify(name) %><% if (baseType) { %> extends <%= toTypescriptType(baseType) %><% } %> {<% for(let prop of properties) { %>
  <%= prop.name() %>: <%= prop.type() %>;<% } %>
}
