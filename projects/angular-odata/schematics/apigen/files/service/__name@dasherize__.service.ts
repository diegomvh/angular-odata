import { Injectable } from '@angular/core';
import { ODataClient, ODataEntitySetService } from 'angular-odata';

@Injectable()
export class <%= classify(name) %>Service extends ODataEntitySetService<<%= toTypescriptType(entityType) %>> {
  constructor(client: ODataClient) {
    super(client, '<%= name %>', '<%= entityType %>');
  }
  <%= camelize(toTypescriptType(entityType)) %>Model(entity?: Partial<<%= toTypescriptType(entityType) %>>) {
    return this.entity().asModel(entity);
  }
  <%= camelize(toTypescriptType(entityType)) %>Collection(entities?: Partial<<%= toTypescriptType(entityType) %>>[]) {
    return this.entities().asCollection(entities);
  }
}