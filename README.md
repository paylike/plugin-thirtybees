# Thirtybees plugin for Paylike

This plugin is *not* developed or maintained by Paylike but kindly made
available by the community.

Released under the MIT license: https://opensource.org/licenses/MIT

You can also find information about the plugin here: https://paylike.io/plugins/thirtybees

## Supported Thirtybees versions

[![Last succesfull test](https://log.derikon.ro/api/v1/log/read?tag=thirtybees&view=svg&label=ThirtyBees&key=ecommerce&background=f7d43f)](https://log.derikon.ro/api/v1/log/read?tag=thirtybees&view=html)

* *The plugin has been tested with most versions of Thirtybees versions at every iteration. We recommend using the latest version of Thirtybees, but if that is not possible for some reason, test the plugin with your Thirtybees version and it would probably function properly.*

## Installation

Once you have installed Thirtybees, follow these simple steps:

1. Signup at [paylike.io](https://paylike.io) (it’s free)
1. Create a live account
1. Create an app key for your Thirtybees website
1. Log in as administrator and upload the release zip under "Modules and services" -> Add a new module (plus icon in the top right corner).
1. It will be installed and you will be redirected to a list that contains the Paylike plugin. Click the Config button to go to the settings screen where you need to add the Public and App key that you can find in your Paylike account (https://paylike.io/).

## Updating settings

Under the extension settings, you can:
 * Update the payment method text in the payment gateways list
 * Update the payment method description in the payment gateways list
 * Update the credit card logos that you want to show (you can change which one you accept under the paylike account).
 * Update the title that shows up in the payment popup
 * Update the popup description, choose whether you want to show the popup  (the cart contents will show up instead)
 * Add test/live keys
 * Set payment mode (test/live)
 * Change the capture type (Instant/Delayed via Paylike Tool)


## Refunding, voiding and capturing

These actions are available in order view mode, PROCESS PAYLIKE PAYMENT box/section.

 * To refund an order you can use the PROCESS PAYLIKE PAYMENT box you can find on the order edit screen by selecting refund in the select and entering the amount.
 * To void an order you can use the PROCESS PAYLIKE PAYMENT box by selecting Void.
 * To capture an order in delayed mode, you can either use the status set in settings (move the order to that status), or you can use the PROCESS PAYLIKE PAYMENT box.

## Available features

1. Capture
   * Thirtybees admin panel: full capture
   * Paylike admin panel: full/partial capture
2. Refund
   * Thirtybees admin panel: full/partial refund
   * Paylike admin panel: full/partial refund
3. Void
   * Thirtybees admin panel: full void
   * Paylike admin panel: full/partial void