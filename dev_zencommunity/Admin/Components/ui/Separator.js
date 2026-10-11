import React from 'react';

// No default vertical margin: callers live inside `tw-gap-*` flex columns
// (the established spacing convention here), so a baked-in `tw-my-*` would
// stack on top of the gap and double the visual space around the rule.
const Separator = ({ className = '' }) => (
	<hr className={`tw-border-0 tw-border-t tw-border-solid tw-border-zc-border ${className}`} />
);

export default Separator;
