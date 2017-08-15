import {
  GraphQLID as MongoID,
  GraphQLList as ListType,
  GraphQLInt as IntType,
  GraphQLNonNull as NonNull,
  GraphQLBoolean as BoolType,
  GraphQLString as StringType,
  GraphQLInputObjectType as InputObject,
  GraphQLObjectType as ObjectType,
} from 'graphql';

import Transaction from '../../mongo/models/transaction';
import { inputTypes as ProductInputTypes } from './productTypes';

const rootType = new ObjectType({
  name: 'Transaction',
  description: 'An application transaction.',
  fields: {
    _id: {
      description: 'The ID of the Product.',
      type: new NonNull(MongoID),
    },
    error: {
      description: 'Any errors that occur during a backend operation will be flagged and provided a message within this object.',
      type: new NonNull(
        new ObjectType({
          name: 'TransactionError',
          fields: () => ({
            hard: {
              description: 'Boolean flag for a hard failure. Operations should not continue until action by user has been taken.',
              type: BoolType,
            },
            soft: {
              description: 'Boolean flag for a soft failure.  Operations should be allowed to continue.',
              type: BoolType,
            },
            message: {
              description: 'Amplifying information about error.  Should be written for user readibility.',
              type: StringType,
            },
          }),
        }),
      ),
    },
    date: {
      description: 'The date this transaction occured.',
      type: StringType,
    },
    user: {
      description: 'The _id of the user who executed this transaction.',
      type: MongoID,
    },
    products: {
      description: 'An array of product(s) ID\'s and their respective quantities, that were purchased.',
      type: new ListType(
        new ObjectType({
          name: 'TransactionProductList',
          fields: () => ({
            _id: {
              description: 'The _id of the Product',
              type: MongoID,
            },
            qty: {
              description: 'The quantity purchased for the respective product.',
              type: IntType,
            },
          }),
        }),
      ),
    },
    sagawa: {
      description: 'The reference Mongo _id for the Sagawa document that was generated due to this transaction.',
      type: StringType,
    },
    marketHero: {
      description: 'The reference Mongo _id for the Market Hero lead.',
      type: MongoID,
    },
    invoiceEmail: {
      description: 'The Mongo _id for the invoice Email that was sent.',
      type: MongoID,
    },
    taxes: {
      description: 'The global tax information at the trime of executing this transaction',
      type: new ObjectType({
        name: 'TransactionTaxesInfo',
        fields: () => ({
          city: { type: IntType },
          state: { type: IntType },
          total: { type: IntType },
        }),
      }),
    },
    total: {
      description: 'The final amount totals including discount & taxes for this transaction.',
      type: new InputObject({
        name: 'TransactionTotalsInfo',
        fields: () => ({
          subTotal: { type: StringType },
          tax: { type: StringType },
          grandTotal: { type: StringType },
          discount: {
            description: 'The discount(s) applied to this transaction.',
            type: new InputObject({
              name: 'TransactionTotalsDiscount',
              fields: () => ({
                qty: { type: BoolType },
                qtyAmount: { type: StringType },
                register: { type: BoolType },
                registerAmount: { type: StringType },
              }),
            }),
          },
        }),
      }),
    },
    subTotal: {
      description: 'The subTotal amount for this transaction.',
      type: StringType,
    },
    tax: {
      description: 'The taxes amount for this transaction.',
      type: new ObjectType({
        name: 'TransactionTaxInfo',
        fields: () => ({
          city: {
            type: IntType,
          },
          state: {
            type: IntType,
          },
          total: {
            type: IntType,
          },
        }),
      }),
    },
    discount: {
      description: 'Description of any discounts that were applied to this transaction.',
      type: new ObjectType({
        name: 'TransactionDiscounts',
        fields: () => ({
          qty: {
            description: 'Boolean describing whether or not the user has received the 25% OFF "Quantity Discount" for this Transaction.',
            type: BoolType,
          },
          qtyAmount: {
            description: 'The dollar amount value if receiving this discount.',
            type: StringType,
          },
          register: {
            description: 'Boolean describing whether or not the user has received the 10% OFF "Register Discount" for this Transaction.',
            type: BoolType,
          },
          registerAmount: {
            description: 'The dollar amount value if receiving this discount.',
            type: StringType,
          },
        }),
      }),
    },
    grandTotal: {
      description: 'The grand total amount for this transaction.',
      type: StringType,
    },
    square: {
      description: 'The information associated with billing and payment services.',
      type: new ObjectType({
        name: 'TransactionSqaureInformation',
        fields: () => ({
          billingAddress: {
            description: 'The address information required by Square.',
            type: new ObjectType({
              name: 'TransactionSquareBillingAddress',
              fields: () => ({
                billingCountry: { type: new NonNull(StringType) },
                billingCity: { type: new NonNull(StringType) },
                billingPrefecture: { type: new NonNull(StringType) },
              }),
            }),
          },
          cardInfo: {
            description: 'The non-sensitive credit card information provided by Square.',
            type: new ObjectType({
              name: 'TransactionSquareCCInfo',
              fields: () => ({
                nameOnCard: { type: StringType },
                last4: { type: IntType },
                cardNonce: { type: StringType },
              }),
            }),
          },
          charge: {
            description: 'The total charges made to the customers credit card for this transaction.',
            type: new ObjectType({
              name: 'TransactionSquareChargeInfo',
              fields: () => ({
                amount: { type: IntType },
                currency: { type: StringType },
              }),
            }),
          },
        }),
      }),
    },
  },
});

const queryTypes = {
  squareLocations: new ObjectType({
    name: 'SquareLocations',
    fields: () => ({
      error: {
        description: 'Any errors that occur during a backend operation will be flagged and provided a message within this object.',
        type: new ObjectType({
          name: 'SquareLocationError',
          fields: () => ({
            hard: {
              description: 'Boolean flag for a hard failure. Operations should not continue until action by user has been taken.',
              type: BoolType,
            },
            soft: {
              description: 'Boolean flag for a soft failure.  Operations should be allowed to continue.',
              type: BoolType,
            },
            message: {
              description: 'Amplifying information about error.  Should be written for user readibility.',
              type: StringType,
            },
          }),
        }),
      },
      id: {
        description: 'The location id.',
        type: StringType,
      },
      name: {
        description: 'The name of this location.',
        type: StringType,
      },
      address: {
        type: new ObjectType({
          name: 'SqaureLocationAddressInfo',
          fields: () => ({
            address_line_1: { type: StringType },
            locality: { type: StringType },
            administrative_district_level_1: { type: StringType },
            postal_code: { type: StringType },
            country: {
              description: 'Two character country code.',
              type: StringType,
            },
          }),
        }),
      },
      timezone: {
        description: '"Country"/"City" format.',
        type: StringType,
      },
      capabilities: {
        description: 'Lists the assigned permissions for the location.',
        type: new ListType(StringType),
      },
    }),
  }),
};

const queries = {
  FetchSquareLocations: {
    type: queryTypes.squareLocations,
    args: {
      // userId: {
      //   description: 'The user\'s unique _id.',
      //   type: MongoID,
      // },
      // accessToken: {
      //   description: 'The user\'s Auth0 access token.',
      //   type: StringType,
      // },
    },
    resolve: () => Transaction.fetchSquareLocation(),
  },
};

const mutations = {
  SubmitFinalOrder: {
    type: rootType,
    args: {
      userId: {
        description: 'The Mongo _id of the User submitting the order.',
        type: new NonNull(MongoID),
      },
      // access_token: {
      //   description: 'The Auth0 issued, JWT access_token.',
      //   type: new NonNull(StringType),
      // },
      cart: {
        description: 'The array of products to be purchased.',
        type: new NonNull(
          new ListType(
            new InputObject({
              name: 'TransactionCartProduct',
              fields: () => ({
                product: {
                  description: 'The product to be purchased as part of this transaction.',
                  type: new NonNull(
                    new InputObject({
                      name: 'TransactionCartProductInput',
                      fields: () => ({
                        _id: { type: new NonNull(MongoID) },
                        qty: { type: new NonNull(IntType) },
                      }),
                    }),
                  ),
                },
                qty: {
                  description: 'The quantity purchased for the respective product',
                  type: new NonNull(IntType),
                },
              }),
            }),
          ),
        ),
      },
      taxes: {
        description: 'The global tax information at the trime of executing this transaction',
        type: new NonNull(
          new InputObject({
            name: 'TransactionTaxesInfoInput',
            fields: () => ({
              city: { type: new NonNull(IntType) },
              state: { type: new NonNull(IntType) },
              total: { type: new NonNull(IntType) },
            }),
          }),
        ),
      },
      total: {
        description: 'The final amount totals including discount & taxes for this transaction.',
        type: new NonNull(
          new InputObject({
            name: 'TransactionTotalsInfoInput',
            fields: () => ({
              subTotal: { type: new NonNull(StringType) },
              tax: { type: new NonNull(StringType) },
              grandTotal: { type: new NonNull(StringType) },
              discount: {
                description: 'The discount(s) applied to this transaction.',
                type: new NonNull(
                  new InputObject({
                    name: 'TransactionTotalsDiscountInput',
                    fields: () => ({
                      qty: { type: BoolType },
                      qtyAmount: { type: StringType },
                      register: { type: BoolType },
                      registerAmount: { type: StringType },
                    }),
                  }),
                ),
              },
            }),
          }),
        ),
      },
      sagawa: {
        description: 'The information associated with shipping and distribution.',
        type: new NonNull(
          new InputObject({
            name: 'TransactionSagawaInfoInput',
            fields: () => ({
              sagawaId: {
                description: 'The Mongo _id for the Sagawa DB Document generated when the user verified their postal code information.',
                type: new NonNull(MongoID),
              },
              shippingInfo: {
                description: 'The shipping information generated by the user.',
                type: new NonNull(
                  new InputObject({
                    name: 'TransactionShippingInfoInput',
                    fields: () => ({
                      givenName: { type: new NonNull(StringType) },
                      familyName: { type: new NonNull(StringType) },
                      email: { type: new NonNull(StringType) },
                      postalCode: { type: new NonNull(IntType) },
                      addressLine1: { type: new NonNull(StringType) },
                      addressLine2: { type: new NonNull(StringType) },
                      country: { type: new NonNull(StringType) },
                      phoneNumber: { type: new NonNull(IntType) },
                    }),
                  }),
                ),
              },
            }),
          }),
        ),
      },
      square: {
        description: 'The information associated with billing and payment services.',
        type: new NonNull(
          new InputObject({
            name: 'TransactionSqaureInformationInput',
            fields: () => ({
              billingAddress: {
                description: 'The address information required by Square.',
                type: new NonNull(
                  new InputObject({
                    name: 'TransactionSquareBillingAddressInput',
                    fields: () => ({
                      billingCountry: { type: new NonNull(StringType) },
                      billingCity: { type: new NonNull(StringType) },
                      billingPrefecture: { type: new NonNull(StringType) },
                    }),
                  }),
                ),
              },
              cardInfo: {
                description: 'The non-sensitive credit card information provided by Square.',
                type: new NonNull(
                  new InputObject({
                    name: 'TransactionSquareCCInfoInput',
                    fields: () => ({
                      nameOnCard: { type: new NonNull(StringType) },
                      last4: { type: new NonNull(IntType) },
                      expiration: { type: new NonNull(StringType) },
                      cardNonce: { type: new NonNull(StringType) },
                      cvn: { type: new NonNull(IntType) },
                      postalCode: { type: StringType },
                    }),
                  }),
                ),
              },
            }),
          }),
        ),
      },
    },
    resolve: (_, args) => Transaction.submitFinalOrder(args),
  },
};

export default {
  rootType,
  queries,
  mutations,
};
