export interface <%= classify(name) %> {<% for(let property of properties) { %>
  <%= property.tsName() %>: <%= property.tsType() %>;<% } %>
}