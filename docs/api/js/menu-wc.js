'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">angular-odata documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                                <li class="link">
                                    <a href="overview.html" data-type="chapter-link">
                                        <span class="icon ion-ios-keypad"></span>Overview
                                    </a>
                                </li>

                            <li class="link">
                                <a href="index.html" data-type="chapter-link">
                                    <span class="icon ion-ios-paper"></span>
                                        README
                                </a>
                            </li>
                        <li class="link">
                            <a href="changelog.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>CHANGELOG
                            </a>
                        </li>
                        <li class="link">
                            <a href="contributing.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>CONTRIBUTING
                            </a>
                        </li>
                        <li class="link">
                            <a href="license.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>LICENSE
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>

                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/ODataModule.html" data-type="entity-link" >ODataModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-ODataModule-68751a86aa70a8ac3df0a855ddb58a7ebab7189335ca1c2bd9adbf34e416328a771fec3e1e9b262f3d1a4364d46e6abe7b0f04ef8f37ba7f721e816655dfbb2f"' : 'data-bs-target="#xs-injectables-links-module-ODataModule-68751a86aa70a8ac3df0a855ddb58a7ebab7189335ca1c2bd9adbf34e416328a771fec3e1e9b262f3d1a4364d46e6abe7b0f04ef8f37ba7f721e816655dfbb2f"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-ODataModule-68751a86aa70a8ac3df0a855ddb58a7ebab7189335ca1c2bd9adbf34e416328a771fec3e1e9b262f3d1a4364d46e6abe7b0f04ef8f37ba7f721e816655dfbb2f"' :
                                        'id="xs-injectables-links-module-ODataModule-68751a86aa70a8ac3df0a855ddb58a7ebab7189335ca1c2bd9adbf34e416328a771fec3e1e9b262f3d1a4364d46e6abe7b0f04ef8f37ba7f721e816655dfbb2f"' }>
                                        <li class="link">
                                            <a href="injectables/ODataClient.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ODataClient</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ODataServiceFactory.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ODataServiceFactory</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/Aggregate.html" data-type="entity-link" >Aggregate</a>
                            </li>
                            <li class="link">
                                <a href="classes/ApplyExpression.html" data-type="entity-link" >ApplyExpression</a>
                            </li>
                            <li class="link">
                                <a href="classes/ArithmeticFunctions.html" data-type="entity-link" >ArithmeticFunctions</a>
                            </li>
                            <li class="link">
                                <a href="classes/ArithmeticOperators.html" data-type="entity-link" >ArithmeticOperators</a>
                            </li>
                            <li class="link">
                                <a href="classes/CollectionFunctions.html" data-type="entity-link" >CollectionFunctions</a>
                            </li>
                            <li class="link">
                                <a href="classes/ComputeExpression.html" data-type="entity-link" >ComputeExpression</a>
                            </li>
                            <li class="link">
                                <a href="classes/ConditionalFunctions.html" data-type="entity-link" >ConditionalFunctions</a>
                            </li>
                            <li class="link">
                                <a href="classes/CountExpression.html" data-type="entity-link" >CountExpression</a>
                            </li>
                            <li class="link">
                                <a href="classes/CountField.html" data-type="entity-link" >CountField</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlAction.html" data-type="entity-link" >CsdlAction</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlActionImport.html" data-type="entity-link" >CsdlActionImport</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlAnnotable.html" data-type="entity-link" >CsdlAnnotable</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlAnnotation.html" data-type="entity-link" >CsdlAnnotation</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlAnnotations.html" data-type="entity-link" >CsdlAnnotations</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlCallable.html" data-type="entity-link" >CsdlCallable</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlCollection.html" data-type="entity-link" >CsdlCollection</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlComplexType.html" data-type="entity-link" >CsdlComplexType</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlEntityContainer.html" data-type="entity-link" >CsdlEntityContainer</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlEntitySet.html" data-type="entity-link" >CsdlEntitySet</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlEntityType.html" data-type="entity-link" >CsdlEntityType</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlEnumMember.html" data-type="entity-link" >CsdlEnumMember</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlEnumType.html" data-type="entity-link" >CsdlEnumType</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlFunction.html" data-type="entity-link" >CsdlFunction</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlFunctionImport.html" data-type="entity-link" >CsdlFunctionImport</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlInclude.html" data-type="entity-link" >CsdlInclude</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlIncludeAnnotations.html" data-type="entity-link" >CsdlIncludeAnnotations</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlKey.html" data-type="entity-link" >CsdlKey</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlMember.html" data-type="entity-link" >CsdlMember</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlNavigationProperty.html" data-type="entity-link" >CsdlNavigationProperty</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlNavigationPropertyBinding.html" data-type="entity-link" >CsdlNavigationPropertyBinding</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlNavigationPropertyPath.html" data-type="entity-link" >CsdlNavigationPropertyPath</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlOnDelete.html" data-type="entity-link" >CsdlOnDelete</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlParameter.html" data-type="entity-link" >CsdlParameter</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlProperty.html" data-type="entity-link" >CsdlProperty</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlPropertyPath.html" data-type="entity-link" >CsdlPropertyPath</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlPropertyRef.html" data-type="entity-link" >CsdlPropertyRef</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlPropertyValue.html" data-type="entity-link" >CsdlPropertyValue</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlRecord.html" data-type="entity-link" >CsdlRecord</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlReference.html" data-type="entity-link" >CsdlReference</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlReferentialConstraint.html" data-type="entity-link" >CsdlReferentialConstraint</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlReturnType.html" data-type="entity-link" >CsdlReturnType</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlSchema.html" data-type="entity-link" >CsdlSchema</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlSingleton.html" data-type="entity-link" >CsdlSingleton</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlString.html" data-type="entity-link" >CsdlString</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlStructuralProperty.html" data-type="entity-link" >CsdlStructuralProperty</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlStructuredType.html" data-type="entity-link" >CsdlStructuredType</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlTerm.html" data-type="entity-link" >CsdlTerm</a>
                            </li>
                            <li class="link">
                                <a href="classes/CsdlTypeDefinition.html" data-type="entity-link" >CsdlTypeDefinition</a>
                            </li>
                            <li class="link">
                                <a href="classes/DateAndTimeFunctions.html" data-type="entity-link" >DateAndTimeFunctions</a>
                            </li>
                            <li class="link">
                                <a href="classes/ExpandExpression.html" data-type="entity-link" >ExpandExpression</a>
                            </li>
                            <li class="link">
                                <a href="classes/ExpandField.html" data-type="entity-link" >ExpandField</a>
                            </li>
                            <li class="link">
                                <a href="classes/Expression.html" data-type="entity-link" >Expression</a>
                            </li>
                            <li class="link">
                                <a href="classes/Field.html" data-type="entity-link" >Field</a>
                            </li>
                            <li class="link">
                                <a href="classes/FilterExpression.html" data-type="entity-link" >FilterExpression</a>
                            </li>
                            <li class="link">
                                <a href="classes/Function.html" data-type="entity-link" >Function</a>
                            </li>
                            <li class="link">
                                <a href="classes/GeoFunctions.html" data-type="entity-link" >GeoFunctions</a>
                            </li>
                            <li class="link">
                                <a href="classes/GroupBy.html" data-type="entity-link" >GroupBy</a>
                            </li>
                            <li class="link">
                                <a href="classes/GroupByTransformations.html" data-type="entity-link" >GroupByTransformations</a>
                            </li>
                            <li class="link">
                                <a href="classes/Grouping.html" data-type="entity-link" >Grouping</a>
                            </li>
                            <li class="link">
                                <a href="classes/GroupingOperators.html" data-type="entity-link" >GroupingOperators</a>
                            </li>
                            <li class="link">
                                <a href="classes/Lambda.html" data-type="entity-link" >Lambda</a>
                            </li>
                            <li class="link">
                                <a href="classes/LambdaOperators.html" data-type="entity-link" >LambdaOperators</a>
                            </li>
                            <li class="link">
                                <a href="classes/LogicalOperators.html" data-type="entity-link" >LogicalOperators</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataActionResource.html" data-type="entity-link" >ODataActionResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataAnnotatable.html" data-type="entity-link" >ODataAnnotatable</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataAnnotation.html" data-type="entity-link" >ODataAnnotation</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataAnnotations.html" data-type="entity-link" >ODataAnnotations</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataApi.html" data-type="entity-link" >ODataApi</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataApiOptions.html" data-type="entity-link" >ODataApiOptions</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataBaseCache.html" data-type="entity-link" >ODataBaseCache</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataBaseService.html" data-type="entity-link" >ODataBaseService</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataBatchRequest.html" data-type="entity-link" >ODataBatchRequest</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataBatchResource.html" data-type="entity-link" >ODataBatchResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataCallable.html" data-type="entity-link" >ODataCallable</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataCallableParser.html" data-type="entity-link" >ODataCallableParser</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataCollection.html" data-type="entity-link" >ODataCollection</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataConfigAsyncLoader.html" data-type="entity-link" >ODataConfigAsyncLoader</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataConfigLoader.html" data-type="entity-link" >ODataConfigLoader</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataConfigSyncLoader.html" data-type="entity-link" >ODataConfigSyncLoader</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataCountResource.html" data-type="entity-link" >ODataCountResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataEntitiesAnnotations.html" data-type="entity-link" >ODataEntitiesAnnotations</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataEntityAnnotations.html" data-type="entity-link" >ODataEntityAnnotations</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataEntityContainer.html" data-type="entity-link" >ODataEntityContainer</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataEntityResource.html" data-type="entity-link" >ODataEntityResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataEntityService.html" data-type="entity-link" >ODataEntityService</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataEntitySet.html" data-type="entity-link" >ODataEntitySet</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataEntitySetResource.html" data-type="entity-link" >ODataEntitySetResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataEntitySetService.html" data-type="entity-link" >ODataEntitySetService</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataEntityTypeKey.html" data-type="entity-link" >ODataEntityTypeKey</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataEnumType.html" data-type="entity-link" >ODataEnumType</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataEnumTypeFieldParser.html" data-type="entity-link" >ODataEnumTypeFieldParser</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataEnumTypeParser.html" data-type="entity-link" >ODataEnumTypeParser</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataFunctionResource.html" data-type="entity-link" >ODataFunctionResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataInMemoryCache.html" data-type="entity-link" >ODataInMemoryCache</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataInStorageCache.html" data-type="entity-link" >ODataInStorageCache</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataMediaResource.html" data-type="entity-link" >ODataMediaResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataMetadata.html" data-type="entity-link" >ODataMetadata</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataMetadataLoader.html" data-type="entity-link" >ODataMetadataLoader</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataMetadataParser.html" data-type="entity-link" >ODataMetadataParser</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataMetadataResource.html" data-type="entity-link" >ODataMetadataResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataModel.html" data-type="entity-link" >ODataModel</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataModelAttribute.html" data-type="entity-link" >ODataModelAttribute</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataModelEvent.html" data-type="entity-link" >ODataModelEvent</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataModelEventEmitter.html" data-type="entity-link" >ODataModelEventEmitter</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataModelField.html" data-type="entity-link" >ODataModelField</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataModelOptions.html" data-type="entity-link" >ODataModelOptions</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataNavigationPropertyResource.html" data-type="entity-link" >ODataNavigationPropertyResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataParameterParser.html" data-type="entity-link" >ODataParameterParser</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataParserSchemaElement.html" data-type="entity-link" >ODataParserSchemaElement</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataPathSegments.html" data-type="entity-link" >ODataPathSegments</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataPathSegmentsHandler.html" data-type="entity-link" >ODataPathSegmentsHandler</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataPropertyAnnotations.html" data-type="entity-link" >ODataPropertyAnnotations</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataPropertyResource.html" data-type="entity-link" >ODataPropertyResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataQueryOptionHandler.html" data-type="entity-link" >ODataQueryOptionHandler</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataQueryOptions.html" data-type="entity-link" >ODataQueryOptions</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataQueryOptionsHandler.html" data-type="entity-link" >ODataQueryOptionsHandler</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataReferenceResource.html" data-type="entity-link" >ODataReferenceResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataReferential.html" data-type="entity-link" >ODataReferential</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataRequest.html" data-type="entity-link" >ODataRequest</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataResource.html" data-type="entity-link" >ODataResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataResponse.html" data-type="entity-link" >ODataResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataResponseOptions.html" data-type="entity-link" >ODataResponseOptions</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataSchema.html" data-type="entity-link" >ODataSchema</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataSchemaElement.html" data-type="entity-link" >ODataSchemaElement</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataSettings.html" data-type="entity-link" >ODataSettings</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataSingleton.html" data-type="entity-link" >ODataSingleton</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataSingletonResource.html" data-type="entity-link" >ODataSingletonResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataSingletonService.html" data-type="entity-link" >ODataSingletonService</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataStructuredType.html" data-type="entity-link" >ODataStructuredType</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataStructuredTypeFieldParser.html" data-type="entity-link" >ODataStructuredTypeFieldParser</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataStructuredTypeParser.html" data-type="entity-link" >ODataStructuredTypeParser</a>
                            </li>
                            <li class="link">
                                <a href="classes/ODataValueResource.html" data-type="entity-link" >ODataValueResource</a>
                            </li>
                            <li class="link">
                                <a href="classes/Operator.html" data-type="entity-link" >Operator</a>
                            </li>
                            <li class="link">
                                <a href="classes/OrderByExpression.html" data-type="entity-link" >OrderByExpression</a>
                            </li>
                            <li class="link">
                                <a href="classes/OrderByField.html" data-type="entity-link" >OrderByField</a>
                            </li>
                            <li class="link">
                                <a href="classes/SearchExpression.html" data-type="entity-link" >SearchExpression</a>
                            </li>
                            <li class="link">
                                <a href="classes/SearchTerm.html" data-type="entity-link" >SearchTerm</a>
                            </li>
                            <li class="link">
                                <a href="classes/SegmentHandler.html" data-type="entity-link" >SegmentHandler</a>
                            </li>
                            <li class="link">
                                <a href="classes/SelectExpression.html" data-type="entity-link" >SelectExpression</a>
                            </li>
                            <li class="link">
                                <a href="classes/StringAndCollectionFunctions.html" data-type="entity-link" >StringAndCollectionFunctions</a>
                            </li>
                            <li class="link">
                                <a href="classes/StringFunctions.html" data-type="entity-link" >StringFunctions</a>
                            </li>
                            <li class="link">
                                <a href="classes/Transformations.html" data-type="entity-link" >Transformations</a>
                            </li>
                            <li class="link">
                                <a href="classes/Type.html" data-type="entity-link" >Type</a>
                            </li>
                            <li class="link">
                                <a href="classes/TypeFunctions.html" data-type="entity-link" >TypeFunctions</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/ODataServiceFactory.html" data-type="entity-link" >ODataServiceFactory</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/PeopleService.html" data-type="entity-link" >PeopleService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/Airline.html" data-type="entity-link" >Airline</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Airport.html" data-type="entity-link" >Airport</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FieldParser.html" data-type="entity-link" >FieldParser</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Flight.html" data-type="entity-link" >Flight</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ODataApiConfigOptions.html" data-type="entity-link" >ODataApiConfigOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ODataCache.html" data-type="entity-link" >ODataCache</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ODataCacheEntry.html" data-type="entity-link" >ODataCacheEntry</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ODataVersionHelper.html" data-type="entity-link" >ODataVersionHelper</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Parser.html" data-type="entity-link" >Parser</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ParserOptions.html" data-type="entity-link" >ParserOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PassedInitialConfig.html" data-type="entity-link" >PassedInitialConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Person.html" data-type="entity-link" >Person</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Photo.html" data-type="entity-link" >Photo</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PlanItem.html" data-type="entity-link" >PlanItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PublicTransportation.html" data-type="entity-link" >PublicTransportation</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Renderable.html" data-type="entity-link" >Renderable</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ResponseOptions.html" data-type="entity-link" >ResponseOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StructuredTypeFieldOptions.html" data-type="entity-link" >StructuredTypeFieldOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Trip.html" data-type="entity-link" >Trip</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <a data-type="chapter-link" href="routes.html"><span class="icon ion-ios-git-branch"></span>Routes</a>
                        </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});