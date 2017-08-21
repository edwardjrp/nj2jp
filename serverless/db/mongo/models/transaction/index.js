/* eslint-disable no-use-before-define, no-console, import/newline-after-import */
import axios from 'axios';
import uuid from 'uuid';
import { Promise as bbPromise } from 'bluebird';
// import User from '../user';
// import Email from '../email';
// import MarketHero from '../marketHero';
// import Sagawa from '../sagawa';
// import Product from '../product';
import transactionSchema from '../../schemas/transactionSchema';
import {
  composeAmount as ComposeAmount,
  getSquareToken as GetSquareToken,
  getSquareLocation as GetSquareLocation,
  handleSquareErrors as HandleSquareErrors,
} from './helpers';
import {
  getMhTransactionTagsMongo as GetMhTransactionTagsMongo,
  getMhTransactionTagsApi as GetMhTransactionTagsApi,
} from '../marketHero/helpers';

require('dotenv').load({ silent: true });

export default (db) => {
  /**
  * Function: "fetchSquareLocation":
  * Queries the Square API for the location respective to this application. Once successfully fetched, verifies the location can handle CC processing.  If verified, returns the locationId to the invoking function.
  *
  * @param {string} country - The country for Square account which the query will be executed..
  *
  * @return {string} locationId.
  */
  transactionSchema.statics.fetchSquareLocation = country =>
  new Promise((resolve, reject) => {
    console.log('\n\n@Transaction.fetchSquareLocation\n');

    axios({
      method: 'get',
      url: 'https://connect.squareup.com/v2/locations',
      headers: { Authorization: `Bearer ${GetSquareToken(country)}` },
    })
    .then((response) => {
      console.log('SUCCEEDED: Fetch Square Location: ', response.data);

      const locations = response.data.locations.filter(({ name }) => name === GetSquareLocation(country));

      if (locations.length) {
        const newLocation = { ...locations[0] };
        newLocation.error = {
          hard: false,
          soft: false,
          message: '',
        };

        if (newLocation.capabilities.includes('CREDIT_CARD_PROCESSING')) {
          console.log('SUCCEEDED: Verify location CC processing.');
          resolve(newLocation);
        } else {
          newLocation.error = {
            hard: true,
            soft: false,
            message: `Location "${newLocation.name}" does not have permission "CREDIT_CARD_PROCESSING".`,
          };
          resolve(newLocation);
        }
      } else {
        console.log('Did not find requested location in Square locations.');
        resolve({
          error: {
            hard: true,
            soft: false,
            message: 'Did not find requested lcoation in Square locations.',
          },
        });
      }
    })
    .catch((error) => {
      console.log('FAILED: Fetch square location: ', error);
      reject(new Error('FAILED: Fetch square location.'));
    });
  });

  /**
  * Function: "squareChargeCard":
  * Charges the customers credit card using the Square API with the required request body, containing the shipping information associated with the Customer.
  *
  * @param {object} chargeInfo
  *
  * @return {object} Square API response.
  */
  transactionSchema.statics.squareChargeCard = chargeInfo =>
  new Promise((resolve, reject) => {
    console.log('\n\n@Transaction.squareChargeCard\n');

    const {
      locationId,
      transactionId,
      shippingEmail,
      shippingAddressLine2,
      shippingCity,
      shippingPrefecture,
      shippingPostalCode,
      shippingCountry,
      billingCountry,
      grandTotal,
      cardNonce,
      jpyFxRate,
    } = chargeInfo;

    axios.post(
      `https://connect.squareup.com/v2/locations/${locationId}/transactions`,
      {
        idempotency_key: uuid(),
        buyer_email_address: shippingEmail,
        shipping_address: {
          address_line_1: shippingAddressLine2,
          address_line_2: 'asdf',
          locality: shippingCity,
          administrative_district_level_1: shippingPrefecture,
          postal_code: shippingPostalCode,
          country: shippingCountry,
        },
        amount_money: {
          amount: ComposeAmount(billingCountry, grandTotal, jpyFxRate),
          currency: billingCountry === 'US' ? 'USD' : 'JPY',
        },
        card_nonce: cardNonce,
        reference_id: transactionId,
        note: `${GetSquareLocation(billingCountry)}: Online order.`,
        delay_capture: false,
      },
      {
        headers: {
          Authorization: `Bearer ${GetSquareToken(billingCountry)}`,
        },
      },
    )
    .then((response) => {
      console.log('Successfully charged customer. ', response.data);
      resolve(response);
    })
    .catch((error) => {
      console.log('%cerror', 'background:red;', error);
      console.log('Error while trying to Authorize Square payment: ', error.response.data.errors);
      reject(`Error while trying to Authorize Square payment:  ${error.response.data.errors[0].detail}`);
    });
  });

  /**
  * Function: "submitFinalOrder"
  * 1. Establishes 3 variables on the highest scope within the function.  These variables will be returned to the client after final promise resolution.
  * 2. Call 3 promises in parallel: 1) Create a new Transaction document with values form the input arguments. 2) Find and Update the User document with important email information that may otherwise not already exist.  3) Call the Square API, fetching the business location based on the Billing country (US or Japan) chosen by the customer.
  * 3. If successful, assign the upper scopes variables their respective values for Transaction & User.
  * 4. Call the Square API again, using the LocationId fetched in the previous step, with any other required info, extracted from the input arguments.
  * 5. If successful, update the User document with the necessary transaction history updates. Create or Update the Market Hero document respective to the User document, and generate the required fields for uploading the order information to Sagawa.
  * 6. If successful, re-save the upper scope User Doc variable with the updated user information & generate the Invoice Email based on language, and when the order will be shipped to the user.  Save the result on the Transaction document.
  * 7. Update the upper scope Transaction Doc variables with the new Transaction information & then call the Sagawa Upload lambda function passing the 1) User Id, 2) Sagawa Id, 3) Transaction Id.
  * 8. If order was successfully uploaded to Sagawa, then response status code will be a 200.  The final response will be resolved with the final 1) Transaction document.
  *
  * @param {object} orderForm - all the inputs from the Order form.
  *
  * @return {object} Mongo Transaction Document.
  */
  transactionSchema.statics.submitFinalOrder = (
    orderForm,
    User,
    Product,
    Email,
    Sagawa,
    MarketHero,
  ) =>
  new Promise((resolve, reject) => {
    console.log('\n\n@Transaction.submitFinalOrder\n');

    console.log('1] ARGS: \n', JSON.stringify(orderForm, null, 2));
    let newTransactionDoc = {};
    let userDoc = {};
    let marketHeroOp = '';

    const {
      userId,
      comments,
      termsAgreement,
      newsletterDecision,
      cart,
      sagawa,
      jpyFxRate,
      taxes,
      total,
      square,
      language,
    } = orderForm;

    Promise.all([
      bbPromise.fromCallback(cb => Transaction.create({
        comments,
        termsAgreement,
        user: userId,
        products: cart,
        emailAddress: sagawa.shippingAddress.email,
        jpyFxRate,
        taxes,
        total,
        square,
        language,
      }, cb)),
      User.findByIdAndUpdate(userId, {
        $set: {
          contactInfo: {
            email: sagawa.shippingAddress.email,
          },
          marketing: {
            newsletterDecision,
          },
        },
      }, { new: true }),
      Transaction.fetchSquareLocation(square.billingCountry),
    ])
    .then((results) => {
      console.log('\n2] SUCCEEDED: 1) Created new Transaction Document. 2) Updated User\'s "email" and "marketing" fields. 3) Fetched Square Location information.\n');

      newTransactionDoc = results[0];
      userDoc = { ...results[1] };

      return Transaction.squareChargeCard({
        locationId: results[2].id,
        transactionId: String(results[0]._id),
        shippingEmail: sagawa.shippingAddress.email,
        shippingAddressLine2: sagawa.shippingAddress.shippingAddressLine2,
        shippingCity: square.shippingAddress.shippingCity,
        shippingPrefecture: square.shippingAddress.shippingPrefecture,
        shippingPostalCode: sagawa.shippingAddress.postalCode,
        shippingCountry: sagawa.shippingAddress.country,
        billingCountry: square.billingCountry,
        grandTotal: total.grandTotal,
        cardNonce: square.cardInfo.cardNonce,
        jpyFxRate,
      });
    })
    .then((response) => {
      console.log('3] SUCCEEDED: Square Charge Customer.');

      if (response.status !== 200) {
        console.log('3a] FAILED: Square Charge Customer: ', response.data);
        resolve({
          error: {
            hard: true,
            soft: false,
            message: HandleSquareErrors(response),
          },
        });
      }
      console.log('3b] Successfully charged customer card.');

      return Promise.all([
        User.findByIdAndUpdate(userDoc._id, {
          $set: {
            'shopping.transactions': [...userDoc.shopping.transactions, newTransactionDoc._id],
            'shopping.cart': [],
          },
        }, { new: true }),
        MarketHero.checkForLead(sagawa.shippingAddress.email),
        Sagawa.handleNewTransaction({
          cart,
          total,
          userId,
          sagawa,
          transactionId: newTransactionDoc._id,
        }, Product),
      ]);
    })
    .then((results) => {
      console.log('4] Success! 1) Updated User "cart" and "transactions" history.  2) Created or Updated Market Hero document. 3) Updated Sagawa document for this transaction.', results);

      userDoc = { ...results[0] };
      marketHeroOp = results[1]._id ? 'updateMongoLead' : 'createMongoLead';
      const sagawaDoc = results[2];

      const lead = {
        language,
        email: sagawa.shippingAddress.email,
        givenName: sagawa.shippingAddress.givenName,
        familyName: sagawa.shippingAddress.familyName,
      };

      return Promise.all([
        Email.createInvoiceEmailBody({
          cart,
          square,
          sagawa: results[2],
          language,
          dbTransaction: newTransactionDoc,
        }),
        MarketHero[marketHeroOp]({
          lead,
          tags: GetMhTransactionTagsMongo({ total, cart, language }),
        }),
        MarketHero.createOrUpdateLead({
          lead,
          tags: GetMhTransactionTagsApi({ total, cart, language }),
        }),
        Transaction.findByIdAndUpdate(newTransactionDoc._id, {
          $set: {
            sagawa: sagawaDoc._id,
          },
        }, { new: true }),
      ]);
    })
    .then((results) => {
      console.log('5] Success! 1) Generate Invoice Email body and insert result into Transaction document. 2) Create or Update Mongo Market Hero document. 3) Create or Update Market Hero API lead. 4) Update Transaction Doc with Sagawa Mongo _id reference.');

      newTransactionDoc = { ...results[0] };

      const promise1 = axios.post('http://localhost:3000/api/sagawa', {
        userId,
        sagawaId: sagawa.sagawaId,
        transactionId: newTransactionDoc._id,
      });
      let promise2 = null;
      let promiseArray = [promise1];

      if (marketHeroOp === 'createMongoLead') {
        promise2 = User.findByIdAndUpdate(userId, {
          $set: { 'marketing.marketHero': results[1]._id },
        }, { new: true });
        promiseArray = [...promiseArray, promise2];
      }

      return Promise.all([...promiseArray]);
    })
    .then((results) => {
      console.log('6] SUCCEEDED: 1) Call Sagawa Order Upload lambda. 2) Update User Document with new MarketHero Doc _id (if necessary).', results);

      const { status, data } = results[0];

      if (results.length === 2) userDoc = results[1];

      if (status !== 200) {
        console.log('FAILED: Upload Order to Sagawa: ', data);
        resolve({
          error: {
            hard: true,
            soft: false,
            message: `Was not able to complete the order: ${data}`,
          },
        });
      }

      return Product.find({ _id: { $in: cart.map(({ _id }) => _id) } }).exec();
    })
    .then((productDocs) => {
      console.log('7] SUCCEEDED: Query for', productDocs.length, ' Product(s) document(s)');

      productDocs.forEach((productDoc) => {
        productDoc.product.quantities.inCarts -= 1;
        productDoc.product.quantities.purchased += 1;
        productDoc.statistics.completedCheckouts += 1;
        productDoc.transactions = [...productDoc.transactions, {
          transactionId: newTransactionDoc._id,
          userId,
        }];
        productDoc.save({ validateBeforeSave: true })
        .then((savedDoc) => {
          console.log('SUCCEEDED: Update "statistics" & "quantities" keys for product: ', `${savedDoc.product.flavor}_${savedDoc.product.nicotineStrength}mg`);
        })
        .catch((error) => {
          console.log('FAILED: Update "statistics" & "quantities" keys for product: ', `${productDoc.product.flavor}_${productDoc.product.nicotineStrength}mg`, '. Error: ', error);
          reject(new Error('FAILED: Update "statistics" & "quantities" keys for product: ', `${productDoc.product.flavor}_${productDoc.product.nicotineStrength}mg`));
        });
      });

      console.log('8] Order complete! Resolving with 1) User doc, 2) Transaction doc.');
      resolve({ transaction: newTransactionDoc, user: userDoc });
    })
    .catch((error) => {
      console.log('FAILED: Create new Transaction Doc & Submit Order.', error);
      reject(error);
    });
  });

  const Transaction = db.model('Transaction', transactionSchema);
  return Transaction;
};