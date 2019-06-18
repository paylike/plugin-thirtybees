<?php


namespace Thirtybees;

use Facebook\WebDriver\Exception\NoAlertOpenException;
use Facebook\WebDriver\Exception\NoSuchElementException;
use Facebook\WebDriver\Exception\StaleElementReferenceException;
use Facebook\WebDriver\Exception\TimeOutException;
use Facebook\WebDriver\Exception\UnexpectedTagNameException;
use Facebook\WebDriver\Remote\RemoteWebElement;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverDimension;
use Facebook\WebDriver\WebDriverExpectedCondition;

class ThirtybeesRunner extends ThirtybeesTestHelper {

	/**
	 * @param $args
	 *
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 * @throws UnexpectedTagNameException
	 */
	public function ready( $args ) {
		$this->set( $args );
		$this->go();
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	public function loginAdmin() {
		$this->goToPage( '/', '#email', true );
		while ( ! $this->hasValue( '#email', $this->user ) ) {
			$this->typeLogin();
		}
		$this->click( '.ladda-button' );
		$this->waitForElement( '.admindashboard' );

	}

	/**
	 *  Insert user and password on the login screen
	 */
	private function typeLogin() {
		$this->type( '#email', $this->user );
		$this->type( '#passwd', $this->pass );
	}

	/**
	 * @param $args
	 */
	private function set( $args ) {
		foreach ( $args as $key => $val ) {
			$name = $key;
			if ( isset( $this->{$name} ) ) {
				$this->{$name} = $val;
			}
		}
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	public function changeCurrency() {
		$this->click( '#blockcurrencies' );
		$this->click( "//*[contains(@title, '" . $this->currency . "')]" );
		$this->waitForPageReload( function () {
		}, 5000 );

	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	public function disableEmail() {
		if ( $this->stop_email === true ) {
			$this->goToPage( '/index.php?controller=AdminEmails', '#PS_MAIL_METHOD_3', true );
			$this->checkbox( '#PS_MAIL_METHOD_3' );
			$this->click( 'submitOptionsmail' );
		}
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */

	public function changeMode() {
		$this->goToPage( '/index.php?controller=AdminModules&configure=paylikepayment&tab_module=payments_gateways&module_name=paylikepayment', '#PAYLIKE_CHECKOUT_MODE', true );
		$this->captureMode();
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	private function settingsCheck() {
		$this->outputVersions();
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */

	private function logVersionsRemotly() {
		$versions = $this->getVersions();
		$this->wd->get( getenv( 'REMOTE_LOG_URL' ) . '&key=' . $this->get_slug( $versions['ecommerce'] ) . '&tag=thirtybees&view=html&' . http_build_query( $versions ) );
		$this->waitForElement( '#message' );
		$message = $this->getText( '#message' );
		$this->main_test->assertEquals( 'Success!', $message, "Remote log failed" );
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	private function getVersions() {
		$this->goToPage( '/index.php?controller=AdminDashboard', null, true );
		$thirtybees = $this->getText( '#shop_version' );
		$this->goToPage( "/index.php?controller=AdminModules", null, true );
		$this->waitForElement( "#filter_payments_gateways" );
		$this->click( "#filter_payments_gateways" );
		$this->waitForElement( "#anchorPaylikepayment" );
		$paylike = $this->getText( '.table #anchorPaylikepayment .module_name' );

		return [ 'ecommerce' => $thirtybees, 'plugin' => $paylike ];
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	private function outputVersions() {
		$this->goToPage( '/index.php?controller=AdminDashboard', null, true );
		$this->main_test->log( 'ThirtyBees Version:', $this->getText( '#shop_version' ) );
		$this->goToPage( "/index.php?controller=AdminModules", null, true );
		$this->waitForElement( "#filter_payments_gateways" );
		$this->click( "#filter_payments_gateways" );
		$this->waitForElement( "#anchorPaylikepayment" );
		$this->main_test->log( 'Paylike Version:', $this->getText( '.table #anchorPaylikepayment .module_name' ) );

	}


	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	public function changeDecimal() {
		$this->goToPage( 'wp-admin/admin.php?page=wc-settings', '#select2-thirtybees_currency-container' );
		$this->type( '#thirtybees_price_decimal_sep', '.' );
	}

	/**
	 *
	 */
	public function submitAdmin() {
		$this->click( '#module_form_submit_btn' );
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 * @throws UnexpectedTagNameException
	 */
	private function directPayment() {
		$this->goToPage( '', '#blockcart' );
		$this->changeCurrency();
		$this->clearCartItem();
		$this->addToCart();
		$this->proceedToCheckout();
		$this->choosePaylike();
		$this->finalPaylike();
		$this->selectOrder();
		if ( $this->capture_mode == 'delayed' ) {
			$this->checkNoCaptureWarning();
			$this->capture();
		} else {
			$this->refund();
		}

	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 * @throws UnexpectedTagNameException
	 */
	public function checkNoCaptureWarning() {
		$this->moveOrderToStatus( 'Payment accepted' );
		$text     = $this->pluckElement( '.history-status tr td', 1 )->getText();
		$messages = explode( "\n", $text );
		$this->main_test->assertEquals( 'Payment accepted', $messages[0], "Not captured warning" );
	}

	/**
	 * @param $status
	 *
	 * @throws NoSuchElementException
	 * @throws UnexpectedTagNameException
	 */
	public function moveOrderToStatus( $status ) {
		$this->click( '#id_order_state_chosen' );
		$this->type( ".chosen-search input", $status );
		$this->pressEnter();
		$this->click( 'submitState' );
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 * @throws UnexpectedTagNameException
	 */
	public function capture() {
		$this->selectValue( "#paylike_action", "capture" );
		$this->click( '#submit_paylike_action' );
		$this->waitElementDisappear( ".margin-form #submit_paylike_action.disabled" );
		$text = $this->pluckElement( '.history-status tr td', 1 )->getText();
		if ( $text == 'Delivered' || $text == 'Delivered' ) {
			$text = $this->pluckElement( '.history-status tr td', 1 )->getText();
		}
		$messages = explode( "\n", $text );
		$this->main_test->assertEquals( 'Delivered', $messages[0], "Delivered" );
	}

	/**
	 *
	 */
	public function captureMode() {
		$this->click( '#PAYLIKE_CHECKOUT_MODE' );
		$this->click( "//*[contains(@value, '" . $this->capture_mode . "')]" );
		$this->click( '#module_form_submit_btn' );;
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	public function clearCartItem() {
		/**
		 * $this->moveToElement('.product-container');
		 * $this->click( '.ajax_add_to_cart_button' );
		 * $this->waitForElement('.continue');
		 * $this->click( '.continue' );
		 * $this->waitForElement('.ajax_cart_quantity');
		 **/
		try {
			$cartCount = $this->getText( '.ajax_cart_quantity' );
		} catch ( StaleElementReferenceException $exception ) {
			// try again
			$cartCount = $this->getText( '.ajax_cart_quantity' );
		}

		$cartCount = preg_replace( "/[^0-9.]/", "", $cartCount );
		if ( $cartCount ) {
			$this->moveToElement( '#blockcart-header' );
			$this->waitForElement( '#button_order_cart' );
			$productRemoves = $this->findElements( '.cart_block_list .remove_link' );
			$this->moveToElement( '#blockcart-header' );

			try {
				$productRemoves[0]->click();
			} catch ( StaleElementReferenceException $exception ) {
				// can happen
			}

			$this->clearCartItem();

		}
	}

	/**
	 *
	 */
	public function addToCart() {
		$this->moveToElement( '.product-container' );
		$this->click( '.ajax_add_to_cart_button' );
		$this->waitForElement( '.next a' );
		$this->click( '.next a' );

	}

	/**
	 *
	 */
	public function proceedToCheckout() {
		$this->waitForElement( '.standard-checkout' );
		$this->click( '.standard-checkout' );
		$this->type( '#email', $this->client_user );
		$this->type( '#passwd', $this->client_pass );
		$this->click( '#SubmitLogin' );
		try {
			$this->waitForElement( '#address_invoice' );
		} catch ( NoSuchElementException $exception ) {
			$this->goToPage( 'order?step=1', '#address_invoice' );
		}
		$this->click( 'processAddress' );
		$this->click( '#cgv' );
		$this->click( 'processCarrier' );
		$this->waitForElement( '#paylike-btn' );
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	public function choosePaylike() {
		$this->waitForElement( '#paylike-btn' );
		$this->click( '#paylike-btn' );
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	public function finalPaylike() {

		$this->popupPaylike();
		$this->waitForElement( ".alert-success" );
		$priceValue = $this->getText( ".alert-success" );
		// because the title of the page matches the checkout title, we need to use the order received class on body
		$this->main_test->assertEquals( 'Congratulations, your payment has been approved', $priceValue );
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	public function popupPaylike() {
		try {
			$this->waitForElement( '.paylike.overlay .payment form #card-number' );
			$this->type( '.paylike.overlay .payment form #card-number', 41000000000000 );
			$this->type( '.paylike.overlay .payment form #card-expiry', '11/22' );
			$this->type( '.paylike.overlay .payment form #card-code', '122' );
			$this->click( '.paylike.overlay .payment form button' );
		} catch ( NoSuchElementException $exception ) {
			$this->confirmOrder();
			$this->popupPaylike();
		}

	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	public function selectOrder() {
		$this->goToPage( "/index.php?controller=AdminOrders", null, true );
		$this->waitForElement( '.text-right .btn-group .icon-search-plus' );
		$this->click( '.text-right .btn-group .icon-search-plus' );
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 * @throws UnexpectedTagNameException
	 */
	public function refund() {
		$this->waitForElement( '#paylike_action' );
		$this->selectValue( "#paylike_action", "refund" );
		$refund       = preg_match_all( '!\d+!', $this->getText( '.amount strong' ), $refund_value );
		$refund_value = $refund_value[0];
		$this->type( 'paylike_amount_to_refund', $refund_value[0] );
		$this->type( 'paylike_refund_reason', 'test' );
		$this->click( '#submit_paylike_action' );
		try {
			$this->waitElementDisappear( ".margin-form #submit_paylike_action.disabled" );
		} catch ( NoSuchElementException $e ) {
			// the element may have already dissapeared
		}
		$text = $this->pluckElement( '.history-status tr td', 1 )->getText();
		if ( $text == 'Refunded' || $text == 'Refunded' ) {
			$text = $this->pluckElement( '.history-status tr td', 1 )->getText();
		}
		$messages = explode( "\n", $text );
		$this->main_test->assertEquals( 'Refunded', $messages[0], "Refunded" );
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	public function confirmOrder() {
		$this->waitForElement( '#paylike-payment-button' );
		$this->click( '#paylike-payment-button' );
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 */
	private function settings() {

		$this->disableEmail();
		$this->changeMode();
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 * @throws UnexpectedTagNameException
	 */
	private function go() {
		$this->changeWindow();
		$this->loginAdmin();

		if ( $this->log_version ) {
			$this->logVersionsRemotly();

			return $this;
		}
		if ( $this->settings_check ) {
			$this->settingsCheck();

			return $this;
		}

		$this->settings();
		$this->directPayment();

	}

	/**
	 *
	 */
	private function changeWindow() {
		$this->wd->manage()->window()->setSize( new WebDriverDimension( 1600, 996 ) );
	}


}

