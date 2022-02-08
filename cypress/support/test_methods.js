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
     */
    makePaymentFromFrontend(currency) {
        /** Go to store frontend. */
        cy.goToPage(this.StoreUrl);

        /** Client frontend login. */
        cy.get('input[name=username]').type(`${this.StoreUsername}`);
        cy.get('input[name=password]').type(`${this.StorePassword}{enter}`);

        /** Change currency & wait for products price to finish update. */
        cy.get('#hikashopcurrency option').each(($option) => {
            if ($option.text().includes(currency)) {
                cy.get('#hikashopcurrency').select($option.val());
            }
        });
        cy.wait(2000);

        /** Add to cart random product. */
        var randomInt = PaylikeTestHelper.getRandomInt(/*max*/ 6);
        cy.get('.hikabtn.hikacart').eq(randomInt).click();

        /** Wait for 'added to cart' notification to disappear */
        cy.wait(3000);
        cy.get('.notifyjs-metro-base.notifyjs-metro-info').should('not.exist');

        /** Proceed to checkout. */
        cy.get('.hikashop_cart_proceed_to_checkout').click();

        /** Choose Paylike. */
        cy.get(`input[id*=${this.PaylikeName}]`).click();

        /**
         * Extract order amount
         */
        cy.get('.hikashop_checkout_cart_final_total').then(($frontendTotalAmount) => {
            /** Get multiplier based on currency code. */
            var multiplier = PaylikeCurrencies.get_paylike_currency_multiplier(currency);

            /** Replace any character except numbers, commas, points */
            var filtered = ($frontendTotalAmount.text()).replace(/[^0-9,.]/g, '')
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
            var expectedAmount = formattedAmount * multiplier;

            /** Save expected amount as global. */
            cy.wrap(expectedAmount).as('expectedAmount');
        });

        /** Go to checkout next step. */
        cy.get('#hikabtn_checkout_next').click();

        /** Check if order was placed. */
        cy.get('#paylike_paying').should('be.visible');

        /**
         * Fill in Paylike popup.
         */
        PaylikeTestHelper.fillAndSubmitPaylikePopup();

        /** Verify amount. */
        /** We verify here, because "window.paylikeAmount" is available after paylike popup show */
        cy.get('@expectedAmount').then(expectedAmount => {
            cy.window().then((win) => {
                expect(expectedAmount).to.eq(Number(win.paylikeAmount))
            })
        });

        /** Check if order was paid. */
        cy.get('.hikashop_paylike_end #paylike_paid').should('be.visible');
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

        PaylikeTestHelper.setPositionRelativeOn('#subhead-container');

        /** Click on first order from table (last created). */
        cy.get('.hikashop_order_number_value a').first().click();

        /**
         * If CaptureMode='Delayed' => make 'capture' (set shipped on order status)
         * If CaptureMode='Instant' => make 'refund' (set refunded on order status)
         */
        if ('Delayed' === this.CaptureMode) {
            PaylikeTestHelper.setPositionRelativeOn('#subhead-container');
            PaylikeTestHelper.changeOrderStatus('shipped');
        } else {
            PaylikeTestHelper.setPositionRelativeOn('#subhead-container');
            PaylikeTestHelper.changeOrderStatus('refunded');
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
    }
}