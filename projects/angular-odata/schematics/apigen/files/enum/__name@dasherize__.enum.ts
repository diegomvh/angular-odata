export enum <%= classify(name) %> {<% for(let member of members) { %>
  <%= member.name %> = <%= member.value %>,<% } %>
}