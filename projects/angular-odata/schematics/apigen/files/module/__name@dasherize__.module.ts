import { NgModule } from '@angular/core';

@NgModule({
  providers: [{<% for(let entitySet of entitySets) { %>
  <%= entitySet.name %>Service,<% } %>
  ]
})
export class <%= classify(name) %>Module { }