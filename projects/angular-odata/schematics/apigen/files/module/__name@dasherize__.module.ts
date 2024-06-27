export enum <%= classify(name) %>Module {<% for(let member of members) { %>
  <%= member.name %> = <%= member.value %>,<% } %>
}