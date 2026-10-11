import React from 'react';

import './styles.scss';

const ZenComSeparator = ( { isTop = false, isBottom = false, suffix = '' } ) => {
	let classNames = ['zen-com-separator'];

    if (isTop && isBottom) {
        classNames.push('zen-com-separator--both');
    } else {
        if (isTop) classNames.push('zen-com-separator--top');
        if (isBottom) classNames.push('zen-com-separator--bottom');
        if (suffix) classNames.push(`zen-com-separator--${suffix}`);
    }

	return <div className={ classNames.join(' ') }></div>;
};

export default ZenComSeparator;