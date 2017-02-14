import React, { PropTypes } from 'react';
import FontAwesome from 'react-fontawesome';

const propTypes = {
  className: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  size: PropTypes.string.isRequired,
  faName: PropTypes.string.isRequired,
};

function CarouselNav({ className, name, size, faName }) {
  return (
    <div className={`${className}-${name}-arrow`}>
      <FontAwesome name={faName} size={size} />
    </div>
  );
}

CarouselSlide.propTypes = propTypes;
export default CarouselSlide;

/* NOTE
1. className example = "homepage-how-carousel"
2. name exmaple = "couple"
 - Result = homepage-how-carousel-couple
*/
