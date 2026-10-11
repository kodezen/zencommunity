import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, Separator, Text } from '@chakra-ui/react';
import { HiOutlineDotsHorizontal } from 'react-icons/hi';

import './styles.scss';

const ZenComMenu = (props) => {
	const {
		icon = <HiOutlineDotsHorizontal color='var(--zencom-font-color)' />,
		options = [],
		suffix = '',
		variant = 'default',
	} = props;

	const [itemSelected, setItemSelected] = useState(false);
	const menuItemRef = useRef(null);
	const relativeTo = useRef(null);

	const handleClick = (e) => {
		if (
			menuItemRef?.current &&
			!menuItemRef?.current?.contains(e.target) &&
			!relativeTo.current.contains(e.target)
		) {
			setItemSelected(false);
		}
	};

	const handleMenuToggle = () => {
		setItemSelected(!itemSelected);
	};

	useEffect(() => {
		document.addEventListener('mousedown', handleClick);
		return () => document.removeEventListener('mousedown', handleClick);
	}, []);

	useEffect(() => {
		if (itemSelected && relativeTo.current) {
			const rect = relativeTo.current.getBoundingClientRect();
			const x = rect.left + window.pageXOffset;
			const y = rect.top + window.pageYOffset;
			const buttonHeight = relativeTo.current.offsetHeight;
			menuItemRef.current.style.position = 'absolute';
			menuItemRef.current.style.left = `${x - 135}px`;
			menuItemRef.current.style.top = `${y + buttonHeight - 5}px`;
			document.body.appendChild(menuItemRef.current);

			// Flip above the trigger when there isn't room below but there is above,
			// so a long options list (e.g. a member's moderation actions) doesn't
			// render off the bottom of the viewport.
			const menuHeight = menuItemRef.current.offsetHeight;
			const spaceBelow = window.innerHeight - rect.bottom;
			const spaceAbove = rect.top;
			const openUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;

			menuItemRef.current.style.top = openUpward
				? `${y - menuHeight - 5}px`
				: `${y + buttonHeight - 5}px`;
		} else if (
			relativeTo.current &&
			relativeTo.current.parentNode === document.body
		) {
			document.body.removeChild(menuItemRef.current);
		}
	}, [itemSelected, relativeTo]);

	const classNames = [
		'zen-com-dd',
		suffix && `zen-com-dd--${suffix}`,
		variant && `zen-com-dd-variant--${variant}`,
	].filter(Boolean).join(' ');

	return (
		<>
			<button
				className={classNames}
				type="button"
				ref={relativeTo}
				onClick={handleMenuToggle}
			>
				{icon}
			</button>
			{itemSelected &&
				createPortal(
					<div
						className={`zen-com-dd__lists ${suffix && `zen-com-dd-${suffix}`
							}`}
						ref={menuItemRef}
					>
						<ul className="zen-com-more-options">
							{options?.map((item, itemIndex) => {
								const handleItemClick = () => {
									setItemSelected(false);
									if ('button' === item.type || 'link' === item.type) {
										return item?.onClick();
									}
									return null;
								};

								return (
									<React.Fragment key={itemIndex}>
										{item.action ? (
											<form
												className="zen-com-more-options__item"
												key={itemIndex}
												action={item.action}
												method={item.method}
											>
												<Button
													{...item}
												/>
												{item.hasBorder && <Separator />}
											</form>
										) : (
											<li
												className="zen-com-more-options__item"
												key={itemIndex}
											>
												<Button
													{...item}
													onClick={handleItemClick}
													className={["Delete", "Leave", "Block"].includes(item.label) ? "zen-com-more-options__remover" : ""}
													disabled={item?.disabled} 
													padding="8px"
													margin={"0"}
													color={'var(--zencom-font-color)'}
												>
													{item?.icon && <Icon as={item?.icon} width="14px" height="14px" />}
													{item?.label && <Text fontSize="14px" fontWeight="400" lineHeight="20px">{item?.label}</Text>}
												</Button>
												{item.hasBorder && <Separator borderColor="var(--zencom-border-color)" />}
											</li>
										)}
									</React.Fragment>
								);
							})}
						</ul>
					</div>,
					document.body
				)}
		</>
	);
};

export default ZenComMenu;
