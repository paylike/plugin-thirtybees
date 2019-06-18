<?php

namespace Thirtybees;


use Facebook\WebDriver\Exception\NoSuchElementException;
use Facebook\WebDriver\Exception\TimeOutException;
use Facebook\WebDriver\Exception\UnexpectedTagNameException;
use Facebook\WebDriver\WebDriver;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;
use Lmc\Steward\Test\AbstractTestCase;

/**
 * @group thirtybees_full_test
 */
class ThirtyBeesFullTest extends AbstractTestCase {

	public $runner;

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 * @throws UnexpectedTagNameException
	 */
	public function testGeneralFunctions() {
		$this->runner = new ThirtybeesRunner( $this );
		$this->runner->ready( array(
				'settings_check' => true,
			)
		);
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 * @throws UnexpectedTagNameException
	 */
	public function testUsdPaymentInstant() {
		$this->runner = new ThirtybeesRunner( $this );
		$this->runner->ready( array(
				'capture_mode' => 'instant',
			)
		);
	}

	/**
	 *
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 * @throws UnexpectedTagNameException
	 */
	public function testUsdPaymentDelayed() {
		$this->runner = new ThirtybeesRunner( $this );
		$this->runner->ready( array(
				'currency'     => 'USD',
				'capture_mode' => 'delayed',
			)
		);
	}

	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 * @throws UnexpectedTagNameException
	 */
	public function testRonPaymentDelayed() {
		$this->runner = new ThirtybeesRunner( $this );
		$this->runner->ready( array(
				'capture_mode' => 'delayed',
				'currency'     => 'RON',
			)
		);
	}


	/**
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 * @throws UnexpectedTagNameException
	 */
	public function testEURPaymentInstant() {
		$this->runner = new ThirtybeesRunner( $this );
		$this->runner->ready( array(
				'capture_mode' => 'instant',
				'currency'     => 'EUR',
			)
		);
	}

	/**
	 *
	 * @throws NoSuchElementException
	 * @throws TimeOutException
	 * @throws UnexpectedTagNameException
	 */
	public function testDkkPaymentInstant() {
		$this->runner = new ThirtybeesRunner( $this );
		$this->runner->ready( array(
				'currency'               => 'DKK',
				'capture_mode'           => 'instant',
				'exclude_manual_payment' => false,
				'log_version' => true,
			)
		);
	}


}
