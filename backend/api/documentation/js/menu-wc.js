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
                    <a href="index.html" data-type="index-link">Elvate-Rest-Api documentation</a>
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
                                <span class="icon ion-ios-paper"></span>README
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
                                <a href="modules/AdminModule.html" data-type="entity-link" >AdminModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AdminModule-d6115234e52f1a2f2be493604b170101d7f0bf5811275418a11fd9b026f7674ad9f7fdf359ab0402b1dd33cad031f7a59924927cda9300a268807d1bc6dd2c00"' : 'data-bs-target="#xs-controllers-links-module-AdminModule-d6115234e52f1a2f2be493604b170101d7f0bf5811275418a11fd9b026f7674ad9f7fdf359ab0402b1dd33cad031f7a59924927cda9300a268807d1bc6dd2c00"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AdminModule-d6115234e52f1a2f2be493604b170101d7f0bf5811275418a11fd9b026f7674ad9f7fdf359ab0402b1dd33cad031f7a59924927cda9300a268807d1bc6dd2c00"' :
                                            'id="xs-controllers-links-module-AdminModule-d6115234e52f1a2f2be493604b170101d7f0bf5811275418a11fd9b026f7674ad9f7fdf359ab0402b1dd33cad031f7a59924927cda9300a268807d1bc6dd2c00"' }>
                                            <li class="link">
                                                <a href="controllers/AdminOrdersController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AdminOrdersController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/AdminProductsController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AdminProductsController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/AdminUserController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AdminUserController</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/AuthModule.html" data-type="entity-link" >AuthModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AuthModule-7b5712f662f64cfe064150dae1a7e8d21ceca56755088b77b16af5cbe7c1d42a3f3de5aff83d412c5ec28259968c1fd1b8dc4860e7220564edc0fea6aaa2b7cd"' : 'data-bs-target="#xs-controllers-links-module-AuthModule-7b5712f662f64cfe064150dae1a7e8d21ceca56755088b77b16af5cbe7c1d42a3f3de5aff83d412c5ec28259968c1fd1b8dc4860e7220564edc0fea6aaa2b7cd"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AuthModule-7b5712f662f64cfe064150dae1a7e8d21ceca56755088b77b16af5cbe7c1d42a3f3de5aff83d412c5ec28259968c1fd1b8dc4860e7220564edc0fea6aaa2b7cd"' :
                                            'id="xs-controllers-links-module-AuthModule-7b5712f662f64cfe064150dae1a7e8d21ceca56755088b77b16af5cbe7c1d42a3f3de5aff83d412c5ec28259968c1fd1b8dc4860e7220564edc0fea6aaa2b7cd"' }>
                                            <li class="link">
                                                <a href="controllers/AuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AuthModule-7b5712f662f64cfe064150dae1a7e8d21ceca56755088b77b16af5cbe7c1d42a3f3de5aff83d412c5ec28259968c1fd1b8dc4860e7220564edc0fea6aaa2b7cd"' : 'data-bs-target="#xs-injectables-links-module-AuthModule-7b5712f662f64cfe064150dae1a7e8d21ceca56755088b77b16af5cbe7c1d42a3f3de5aff83d412c5ec28259968c1fd1b8dc4860e7220564edc0fea6aaa2b7cd"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AuthModule-7b5712f662f64cfe064150dae1a7e8d21ceca56755088b77b16af5cbe7c1d42a3f3de5aff83d412c5ec28259968c1fd1b8dc4860e7220564edc0fea6aaa2b7cd"' :
                                        'id="xs-injectables-links-module-AuthModule-7b5712f662f64cfe064150dae1a7e8d21ceca56755088b77b16af5cbe7c1d42a3f3de5aff83d412c5ec28259968c1fd1b8dc4860e7220564edc0fea6aaa2b7cd"' }>
                                        <li class="link">
                                            <a href="injectables/AuthService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/JwtAuthGuard.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >JwtAuthGuard</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/JwtStrategy.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >JwtStrategy</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/RefreshTokenStrategy.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >RefreshTokenStrategy</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/OrdersModule.html" data-type="entity-link" >OrdersModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-OrdersModule-2774af7fc9a7c0aab131d832f5f7884907388e445f3932ba36ad72d46bffb486f1710fa1ba5dc97172cd881ee3240b2630d3eda6c9673fbcf20bfd4432c9a5fc"' : 'data-bs-target="#xs-injectables-links-module-OrdersModule-2774af7fc9a7c0aab131d832f5f7884907388e445f3932ba36ad72d46bffb486f1710fa1ba5dc97172cd881ee3240b2630d3eda6c9673fbcf20bfd4432c9a5fc"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-OrdersModule-2774af7fc9a7c0aab131d832f5f7884907388e445f3932ba36ad72d46bffb486f1710fa1ba5dc97172cd881ee3240b2630d3eda6c9673fbcf20bfd4432c9a5fc"' :
                                        'id="xs-injectables-links-module-OrdersModule-2774af7fc9a7c0aab131d832f5f7884907388e445f3932ba36ad72d46bffb486f1710fa1ba5dc97172cd881ee3240b2630d3eda6c9673fbcf20bfd4432c9a5fc"' }>
                                        <li class="link">
                                            <a href="injectables/OrdersService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >OrdersService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/ProductsModule.html" data-type="entity-link" >ProductsModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-ProductsModule-c428209c97292406005f5476d0d8601f8de68bdcb070e7339a9b06df8cb0867a5c8c9743a859929e5a6b763c44c9ad92b6273c2861e851bd3c52671c64bbc588"' : 'data-bs-target="#xs-injectables-links-module-ProductsModule-c428209c97292406005f5476d0d8601f8de68bdcb070e7339a9b06df8cb0867a5c8c9743a859929e5a6b763c44c9ad92b6273c2861e851bd3c52671c64bbc588"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-ProductsModule-c428209c97292406005f5476d0d8601f8de68bdcb070e7339a9b06df8cb0867a5c8c9743a859929e5a6b763c44c9ad92b6273c2861e851bd3c52671c64bbc588"' :
                                        'id="xs-injectables-links-module-ProductsModule-c428209c97292406005f5476d0d8601f8de68bdcb070e7339a9b06df8cb0867a5c8c9743a859929e5a6b763c44c9ad92b6273c2861e851bd3c52671c64bbc588"' }>
                                        <li class="link">
                                            <a href="injectables/ProductsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ProductsService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/UsersModule.html" data-type="entity-link" >UsersModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-UsersModule-0c9239c9c41462e6d9475eac8b2cd9d3d6985608e7103e27f064d44c15ca726783d711c41b8ca7e1288ac3b58ebf8bfe82651546de8495500be2261cd207f2db"' : 'data-bs-target="#xs-injectables-links-module-UsersModule-0c9239c9c41462e6d9475eac8b2cd9d3d6985608e7103e27f064d44c15ca726783d711c41b8ca7e1288ac3b58ebf8bfe82651546de8495500be2261cd207f2db"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-UsersModule-0c9239c9c41462e6d9475eac8b2cd9d3d6985608e7103e27f064d44c15ca726783d711c41b8ca7e1288ac3b58ebf8bfe82651546de8495500be2261cd207f2db"' :
                                        'id="xs-injectables-links-module-UsersModule-0c9239c9c41462e6d9475eac8b2cd9d3d6985608e7103e27f064d44c15ca726783d711c41b8ca7e1288ac3b58ebf8bfe82651546de8495500be2261cd207f2db"' }>
                                        <li class="link">
                                            <a href="injectables/UsersService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >UsersService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                </ul>
                </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#entities-links"' :
                                'data-bs-target="#xs-entities-links"' }>
                                <span class="icon ion-ios-apps"></span>
                                <span>Entities</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="entities-links"' : 'id="xs-entities-links"' }>
                                <li class="link">
                                    <a href="entities/Address.html" data-type="entity-link" >Address</a>
                                </li>
                                <li class="link">
                                    <a href="entities/Order.html" data-type="entity-link" >Order</a>
                                </li>
                                <li class="link">
                                    <a href="entities/OrderItem.html" data-type="entity-link" >OrderItem</a>
                                </li>
                                <li class="link">
                                    <a href="entities/Product.html" data-type="entity-link" >Product</a>
                                </li>
                                <li class="link">
                                    <a href="entities/Roles.html" data-type="entity-link" >Roles</a>
                                </li>
                                <li class="link">
                                    <a href="entities/Users.html" data-type="entity-link" >Users</a>
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
                                <a href="classes/AdminProductQueryDto.html" data-type="entity-link" >AdminProductQueryDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/AdminUpdateUserDto.html" data-type="entity-link" >AdminUpdateUserDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/AdminUserQueryDto.html" data-type="entity-link" >AdminUserQueryDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateOrderDto.html" data-type="entity-link" >CreateOrderDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateProductDto.html" data-type="entity-link" >CreateProductDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateUserDto.html" data-type="entity-link" >CreateUserDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/LoginDto.html" data-type="entity-link" >LoginDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/OrderItemDto.html" data-type="entity-link" >OrderItemDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateOrderDto.html" data-type="entity-link" >UpdateOrderDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateProductDto.html" data-type="entity-link" >UpdateProductDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateStockDto.html" data-type="entity-link" >UpdateStockDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateUserDto.html" data-type="entity-link" >UpdateUserDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UserQueryDto.html" data-type="entity-link" >UserQueryDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ValidationExceptionFilter.html" data-type="entity-link" >ValidationExceptionFilter</a>
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
                                    <a href="injectables/RefreshTokenGuard.html" data-type="entity-link" >RefreshTokenGuard</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#guards-links"' :
                            'data-bs-target="#xs-guards-links"' }>
                            <span class="icon ion-ios-lock"></span>
                            <span>Guards</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="guards-links"' : 'id="xs-guards-links"' }>
                            <li class="link">
                                <a href="guards/RolesGuard.html" data-type="entity-link" >RolesGuard</a>
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
                                <a href="interfaces/CustomerReportRow.html" data-type="entity-link" >CustomerReportRow</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/JwtPayload.html" data-type="entity-link" >JwtPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PaginatedResponse.html" data-type="entity-link" >PaginatedResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PaginatedResponse-1.html" data-type="entity-link" >PaginatedResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PaginationMeta.html" data-type="entity-link" >PaginationMeta</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PaginationMeta-1.html" data-type="entity-link" >PaginationMeta</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ProductPerformanceRow.html" data-type="entity-link" >ProductPerformanceRow</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SalesReportRow.html" data-type="entity-link" >SalesReportRow</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ValidationErrorItem.html" data-type="entity-link" >ValidationErrorItem</a>
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
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
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