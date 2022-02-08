export let PaylikeTestHelper = {
    /**
     * Set position=relative on selected element
     * Useful when an element cover another element
     *
     * @param {String} selector
     */
    setPositionRelativeOn(selector) {
        cy.get(selector).then(($selectedElement) => {
            $selectedElement.attr('style', 'position:relative;');
        });
    },
    /**
     * Get a random int/float between 0 and provided max
     * @param {int|float} max
     * @returns int|float
     */
    getRandomInt(max) {
        return Math.floor(Math.random() * max);
    },
    /**
     * Fill Paylike popup and submit the form
     */
    fillAndSubmitPaylikePopup() {
        cy.get('#card-number').type(`${Cypress.env('ENV_CARD_NUMBER')}`);
        cy.get('#card-expiry').type(`${Cypress.env('ENV_CARD_EXPIRY')}`);
        cy.get('#card-code').type(`${Cypress.env('ENV_CARD_CVV')}{enter}`);
    },
    /**
     * Change order status
     */
    changeOrderStatus(status) {
        cy.get('.hkc-md-6 #hikashop_order_field_general a .fa-pen').click();
        cy.get('.hikashop_order_status select').select(status);
        cy.get('.hkc-md-6 #hikashop_order_field_general .fa-save').click();
    },
    /**
     * Login into admin
     */
    loginIntoAdmin() {
        /** Select username & password inputs, then press enter. */
        cy.get('input[name=email]').type(`${Cypress.env('ENV_ADMIN_USER')}`);
        cy.get('input[name=passwd]').type(`${Cypress.env('ENV_ADMIN_PASS')}{enter}`);
        cy.wait(2000);
    },
};
