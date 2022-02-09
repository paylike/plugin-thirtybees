/// <reference types="cypress" />

'use strict';

import { PaylikeTestHelper } from './test_helper.js';
import { PaylikeCurrencies } from './currencies.js';

export var TestMethods = {

    /** Admin & frontend user credentials. */
    StoreUrl: Cypress.env('ENV_STORE_URL'),
    AdminUrl: Cypress.env('ENV_ADMIN_URL'),
    StoreUsername: Cypress.env('ENV_CLIENT_USER'),
    StorePassword: Cypress.env('ENV_CLIENT_PASS'),

    RemoteVersionLogUrl: Cypress.env('REMOTE_LOG_URL'),
    CaptureMode: Cypress.env('ENV_CAPTURE_MODE'),

    /**
     * Constants used to make or skip some tests.
     */
    NeedToAdminLogin: true === Cypress.env('ENV_STOP_EMAIL') ||
                      true === Cypress.env('ENV_LOG_VERSION') ||
                      true === Cypress.env('ENV_SETTINGS_CHECK'),

    /** Construct some variables to be used bellow. */
    ShopName: 'thirtybees',
    PaylikeName: 'paylike',
    ModulesAdminUrl: '/index.php?controller=AdminModules',
    ManageEmailSettingUrl: '/index.php?controller=AdminEmails',
    OrdersPageAdminUrl: '/index.php?controller=AdminOrders',

    /**
     * Get Shop & Paylike versions and send log data.
     */
    logVersions() {
        cy.get('#shop_version').then(($shopVersionFromPage) => {
            var footerText = $shopVersionFromPage.text();
            var shopVersion = footerText.replace(/[^0-9.]/g, '');
            cy.wrap(shopVersion).as('shopVersion');
        });

        /** Go to system settings admin page. */
        cy.goToPage(this.ModulesAdminUrl);

        /** Select payment gateways. */
        cy.get('#filter_payments_gateways').click();

        cy.get('.table #anchorPaylikepayment .module_name').then($paylikeVersionFromPage => {
            var paylikeVersion = ($paylikeVersionFromPage.text()).replace(/[^0-9.]/g, '');
            /** Make global variable to be accessible bellow. */
            cy.wrap(paylikeVersion).as('paylikeVersion');
        });

        /** Get global variables and make log data request to remote url. */
        cy.get('@shopVersion').then(shopVersion => {
            cy.get('@paylikeVersion').then(paylikeVersion => {

                cy.request('GET', this.RemoteVersionLogUrl, {
                    key: shopVersion,
                    tag: this.ShopName,
                    view: 'html',
                    ecommerce: shopVersion,
                    plugin: paylikeVersion
                }).then((resp) => {
                    expect(resp.status).to.eq(200);
                });
            });
        });
    },

    /**
     * Modify email settings (disable notifications)
     */
    deactivateEmailNotifications() {
        /** Go to email settings page. */
        cy.goToPage(this.ManageEmailSettingUrl);

        cy.get('#PS_MAIL_METHOD_3').click();
        cy.get('#mail_fieldset_email .panel-footer button').click();
    },

    /**
     * Modify email settings (disable notifications)
     */
    activateEmailNotifications() {
        /** Go to email settings page. */
        cy.goToPage(this.ManageEmailSettingUrl);

        cy.get('#PS_MAIL_METHOD_1').click();
        cy.get('#mail_fieldset_email .panel-footer button').click();
    },

    /**
     * Modify Paylike settings
     */
    changePaylikeCaptureMode() {
        /** Go to modules page, and select Paylike. */
        cy.goToPage(this.ModulesAdminUrl);

        /** Select payment gateways. */
        cy.get('#filter_payments_gateways').click();

        cy.get('a[href*="configure=paylikepayment&tab_module=payments_gateways&module_name=paylikepayment"').click();
        cy.wait(1000);

        /** Change capture mode. */
        cy.get('#PAYLIKE_CHECKOUT_MODE').select(this.CaptureMode);
        cy.get('#module_form_submit_btn').click();
    },

    /**
     * Make an instant payment
     * @param {String} currency
     */
    makePaymentFromFrontend(currency) {
        /** Go to store frontend. */
        cy.goToPage(this.StoreUrl);

        /** Change currency & wait for products price to finish update. */
        cy.get('#blockcurrencies .dropdown-toggle').click();
        cy.get('#blockcurrencies ul a').each(($listLink) => {
            if ($listLink.text().includes(currency)) {
                cy.get($listLink).click();
            }
        });
        cy.wait(1000);

        /** Make all add-to-cart buttons visible. */
        cy.get('.product_list.grid .button-container').each(($div) => {
            $div.css({'visibility':'visible', 'opacity': '100'})
        });

        /** Add to cart random product. */
        var randomInt = PaylikeTestHelper.getRandomInt(/*max*/ 6);
        cy.get('.ajax_add_to_cart_button').eq(randomInt).click();

        /** Proceed to checkout. */
        cy.get('.next a').click();
        cy.get('.standard-checkout').click();

        /**
         * Client frontend login.
         */
        cy.get('#email').type(`${this.StoreUsername}`);
        cy.get('input[name=passwd]').type(`${this.StorePassword}{enter}`);

        /** Continue checkout. */
        cy.get('button[name=processAddress]').click();
        cy.get('#cgv').click();
        cy.get('.standard-checkout').click();

        /** Verify amount. */
        cy.get('#total_price').then(($totalAmount) => {
            var expectedAmount = this.filterAndGetAmountInMinor($totalAmount, currency);
            cy.window().then(($win) => {
                expect(expectedAmount).to.eq(Number($win.amount))
            })
        });

        /** Click on Paylike. */
        cy.get('#paylike-btn').click();

        /**
         * Fill in Paylike popup.
         */
        PaylikeTestHelper.fillAndSubmitPaylikePopup();

        /** Check if order was paid. */
        cy.get('.alert-success').should('contain.text', 'Congratulations, your payment has been approved');
    },

    /**
     * Process last order from admin panel
     */
    processOrderFromAdmin(contextFlag = false) {

        /** Login & go to admin orders page. */
        if (false === this.NeedToAdminLogin && !contextFlag) {
            cy.goToPage(this.OrdersPageAdminUrl);
            PaylikeTestHelper.loginIntoAdmin();
        } else {
            cy.goToPage(this.OrdersPageAdminUrl);
        }

        /** Click on first (latest in time) order from orders table. */
        cy.get('.table.order tbody tr').first().click();

        /**
         * If CaptureMode='Delayed', set shipped on order status & make 'capture'
         * If CaptureMode='Instant', set refunded on order status & make 'refund'
         */
        if ('Delayed' === this.CaptureMode) {
            // this.changeOrderStatus('shipped');
            this.paylikeActionOnOrderAmount('capture');
        } else {
            // this.changeOrderStatus('refunded');
            this.paylikeActionOnOrderAmount('refund');
        }
    },
    /**
     * Make payment with specified currency and process order
     */
    payWithSelectedCurrency(currency, contextFlag = false) {

        /** Make an instant payment. */
        it(`makes a Paylike payment with "${currency}"`, () => {
            this.makePaymentFromFrontend(currency);
        });

        /** Process last order from admin panel. */
        it('process (capture/refund/void) an order from admin panel', () => {
            this.processOrderFromAdmin(contextFlag);
        });

        /** Send log if currency = DKK. */
        /**
         * HARDCODED currency
         */
        if ('DKK' == currency) {
            it('log shop & paylike versions remotely', () => {
                this.logVersions();
            });
        }
    },
    /**
     * Filter amount text with symbols
     * Get it in currency minor unit
     *
     * @param {Object} $unfilteredAmount
     * @param {String} currency
     */
    filterAndGetAmountInMinor($unfilteredAmount, currency) {
        /** Replace any character except numbers, commas, points */
        var filtered = ($unfilteredAmount.text()).replace(/[^0-9,.]/g, '')
        var matchPointFirst = filtered.match(/\..*,/g);
        var matchCommaFirst = filtered.match(/,.*\./g);

        if (matchPointFirst) {
            var amountAsText = (filtered.replace('.', '')).replace(',', '.');
        } else if (matchCommaFirst) {
            var amountAsText = filtered.replace(',', '');
        } else {
            var amountAsText = filtered.replace(',', '.');
        }

        var formattedAmount = parseFloat(amountAsText);

        /** Get multiplier based on currency code. */
        var multiplier = PaylikeCurrencies.get_paylike_currency_multiplier(currency);

        return formattedAmount * multiplier;
    },
    // /**
    //  * Change order status
    //  * @param {String} status
    //  */
    // changeOrderStatus(status) {
    //     cy.get('.text-right .btn-group .icon-search-plus').click();
    //     cy.get('#id_order_state_chosen').clear().type(`${status}{enter}`);
    //     cy.get('button[name=submitState]').click()
    // },
    /**
     * Capture an order amount
     * @param {String} paylikeAction
     */
     paylikeActionOnOrderAmount(paylikeAction) {
        cy.get('#paylike_action').select(paylikeAction);
        cy.get('#submit_paylike_action').click()
        cy.get('#alert').should('not.exist');
    },
}