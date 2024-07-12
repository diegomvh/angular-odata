import { NgModule } from '@angular/core';<% for (let imp of imports) { %>
import { <%= imp.names.join(", ") %> } from '<%= imp.path() %>';<% } %>

@NgModule({
  providers: [<% for(let service of services) { %>
    <%= service.name() %>,<% } %>
  ]
})
export class <%= classify(name) %> { }
