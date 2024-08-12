export const <%= type %> = '<%= fullName %>';
export enum <%= classify(name) %> {<% for(let value of values) { %>
  <%= value.name() %> = <%= value.value() %>,<% } %>
}
