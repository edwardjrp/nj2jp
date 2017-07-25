import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Masonry from 'masonry-layout';

import {
  BreadCrumb,
  BillingAddress,
  ShippingAddress,
  ShippingMethod,
  CreditCardInfo,
  ProductReview,
  GrandTotal,
  ErrorDialogue,
} from './component.imports';

const { arrayOf, object } = PropTypes;

class ExpressCheckout extends Component {
  static propTypes = {
    cart: arrayOf(object),
  }
  static defaultProps = {
    cart: [],
  }
  constructor(props) {
    super(props);

    this.state = {
      cart: [],
      newsletterDecision: true,
    };
  }

  componentWillUpdate() {
    const msnry = new Masonry('.grid', { // eslint-disable-line
      itemSelector: '.checkout__grid',
      columnWidth: 340,
      gutter: 22,
    });
  }

  routerPush = (e) => {
    this.props.push(e.target.dataset.slug || e.target.parentNode.dataset.slug);
  }

  handleNewsletterChange = () => this.setState(prevState => ({ newsletterDecision: !prevState.newsletterDecision }))

  render() {
    const {
      cart
    } = this.props;

    const {
      newsletterDecision,
    } = this.state;

    return (
      <div className="checkout__container">
        <BreadCrumb
          paths={['Home']}
          classes={['home']}
          destination={['']}
          lastCrumb="Express Checkout"
        />
        <div className="checkout__title">
          <h1>Express Checkout</h1>
        </div>
        <form onSubmit={this.handlerSubmitOrder}>
          <div className="checkout__body grid">
            <div className="checkout__grid">
              <ProductReview
                cart={cart}
                routerPush={this.routerPush}
                newsletterDecision={newsletterDecision}
                handleNewsletterChange={this.handleNewsletterChange}
              />
              <ShippingMethod />
            </div>
            <div className="checkout__grid">
              <BillingAddress />
              <ShippingAddress />
            </div>
            <div className="checkout__grid">
              <CreditCardInfo />
              <GrandTotal />
              <ErrorDialogue />
            </div>
          </div>
        </form>
      </div>
    );
  }
}
export default ExpressCheckout;
