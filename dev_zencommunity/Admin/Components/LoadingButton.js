import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Admin-local Tailwind port of the shared Components/LoadingButton (Chakra).
 * Auto mode: if `onClick` returns a thenable, the button spins until it
 * settles. Explicit mode: honors a `loading` prop (e.g. Formik isSubmitting).
 */
const LoadingButton = ({ onClick, loading, disabled, className = '', children, ...props }) => {
	const [autoLoading, setAutoLoading] = useState(false);
	const isMounted = useRef(true);

	useEffect(() => () => { isMounted.current = false; }, []);

	const isLoading = Boolean(loading) || autoLoading;

	const handleClick = useCallback((event) => {
		if (!onClick || isLoading) return;
		const result = onClick(event);
		if (result && typeof result.then === 'function') {
			setAutoLoading(true);
			Promise.resolve(result).finally(() => {
				if (isMounted.current) setAutoLoading(false);
			});
		}
	}, [onClick, isLoading]);

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={disabled || isLoading}
			className={className}
			{...props}
		>
			{isLoading && (
				<span className="tw-mr-1.5 tw-inline-block tw-h-3.5 tw-w-3.5 tw-animate-spin tw-rounded-full tw-border-2 tw-border-current tw-border-t-transparent tw-align-middle" />
			)}
			{children}
		</button>
	);
};

export default LoadingButton;
