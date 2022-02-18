/// <reference types="cypress" />

'use strict';

import { PaylikeTestHelper } from './test_helper.js';

export var TestMethods = {

    /** Admin & frontend user credentials. */
    StoreUrl: (Cypress.env('ENV_ADMIN_URL').match(/^(?:http(?:s?):\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/im))[0],
    AdminUrl: Cypress.env('ENV_ADMIN_URL'),
    RemoteVersionLogUrl: Cypress.env('REMOTE_LOG_URL'),
    CaptureMode: 'Delayed',

    /** Construct some variables to be used bellow. */
    ShopName: 'thirtybees',
    PaylikeName: 'paylike',
    ModulesAdminUrl: '/index.php?controller=AdminModules',
    ManageEmailSettingUrl: '/index.php?controller=AdminEmails',
    OrdersPageAdminUrl: '/index.php?controller=AdminOrders',

    /**
     * Login to admin backend account
     */
     loginIntoAdminBackend() {
        cy.loginIntoAccount('input[name=email]', 'input[name=passwd]', 'admin');
    },
    /**
     * Login to client|user frontend account
     */
     loginIntoClientAccount() {
        cy.loginIntoAccount('#email', 'input[name=passwd]', 'client');
    },

    /**
     * Modify Paylike settings
     */
    changePaylikeCaptureMode() {
        /** Go to modules page, and select Paylike. */
        cy.goToPage(this.ModulesAdminUrl);

        /** Select payment gateways. */
        cy.get('#filter_payments_gateways').click();

        cy.get('a[href*="configure=paylikepayment&tab_module=payments_gateways"').click();
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
        PaylikeTestHelper.setVisibleOn('.product_list.grid .button-container');

        cy.wait(1000);

        /** Add to cart random product. */
        var randomInt = PaylikeTestHelper.getRandomInt(/*max*/ 6);
        cy.get('.ajax_add_to_cart_button').eq(randomInt).click();

        /** Proceed to checkout. */
        cy.get('.next a').click();
        cy.get('.standard-checkout').click();

        /** Continue checkout. */
        cy.get('button[name=processAddress]').click();
        cy.get('#cgv').click();
        cy.get('.standard-checkout').click();

        /** Verify amount. */
        cy.get('#total_price').then(($totalAmount) => {
            var expectedAmount = PaylikeTestHelper.filterAndGetAmountInMinor($totalAmount, currency);
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

        cy.wait(1000);

        /** Check if order was paid. */
        cy.get('.alert-success').should('contain.text', 'Congratulations, your payment has been approved');
    },

    /**
     * Make payment with specified currency and process order
     *
     * @param {String} currency
     * @param {String} paylikeAction
     */
     payWithSelectedCurrency(currency, paylikeAction) {
        /** Make an instant payment. */
        it(`makes a Paylike payment with "${currency}"`, () => {
            this.makePaymentFromFrontend(currency);
        });

        /** Process last order from admin panel. */
        it(`process (${paylikeAction}) an order from admin panel`, () => {
            this.processOrderFromAdmin(paylikeAction, currency);
        });
    },

    /**
     * Process last order from admin panel
     * @param {String} paylikeAction
     * @param {String} currency
     */
     processOrderFromAdmin(paylikeAction, currency = '') {
        /** Go to admin orders page. */
        cy.goToPage(this.OrdersPageAdminUrl);

        /** Click on first (latest in time) order from orders table. */
        cy.get('.table.order tbody tr').first().click();

        /**
         * If CaptureMode='Delayed', set shipped on order status & make 'capture'/'void'
         * If CaptureMode='Instant', set refunded on order status & make 'refund'
         */
         this.paylikeActionOnOrderAmount(paylikeAction, currency);
    },

    /**
     * Capture an order amount
     * @param {String} paylikeAction
     * @param {String} currency
     * @param {Boolean} partialRefund
     */
     paylikeActionOnOrderAmount(paylikeAction, currency = '', partialRefund = false) {
        cy.get('#paylike_action').select(paylikeAction);

        /** Get random 1 | 0. */
        var random  = PaylikeTestHelper.getRandomInt(/*max*/ 1);
        if (1 === random) {
            partialRefund = true;
        }

        /** Enter full amount for refund. */
        if ('refund' === paylikeAction) {
            cy.get('#total_order  .amount').then(($totalAmount) => {
                var majorAmount = PaylikeTestHelper.filterAndGetAmountInMajorUnit($totalAmount, currency);
                /**
                 * Subtract 2 from amount.
                 * Assume that we do not have products with total amount of 2 units
                 */
                if (partialRefund) {
                    majorAmount -= 2
                }
                cy.get('input[name=paylike_amount_to_refund]').clear().type(`${majorAmount}`);
                cy.get('input[name=paylike_refund_reason]').clear().type('automatic refund');
            });
        }

        cy.get('#submit_paylike_action').click();
        cy.wait(1000);
        cy.get('#alert.alert-info').should('not.exist');
        cy.get('#alert.alert-warning').should('not.exist');
        cy.get('#alert.alert-danger').should('not.exist');
    },

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
}
