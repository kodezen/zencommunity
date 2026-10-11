import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { LuArrowLeft } from 'react-icons/lu';
import './group-settings.scss';

/**
 * Presentation shell for the member-facing Group settings page, after the
 * admin panel's settings pattern: a header card, a sticky section nav on the
 * left, and one bordered card per section with an icon header. Each section
 * is an anchor the nav scrolls to and highlights while it's in view.
 */

export const GroupSettingsHeader = ({ title, subtitle, image, fallbackIcon: FallbackIcon, onBack, dirty, action }) => (
    <header className="zc-gs-header">
        <button type="button" className="zc-gs-header__back" onClick={onBack} aria-label={__('Back', 'zencommunity')} title={__('Back', 'zencommunity')}>
            <LuArrowLeft />
        </button>
        <span className="zc-gs-header__tile">
            {image ? <img src={image} alt="" /> : FallbackIcon && <FallbackIcon />}
        </span>
        <div className="zc-gs-header__text">
            <h1 className="zc-gs-header__title">{title}</h1>
            {subtitle && <p className="zc-gs-header__subtitle">{subtitle}</p>}
        </div>
        <div className="zc-gs-header__actions">
            {dirty && <span className="zc-gs-header__dirty">{__('Unsaved changes', 'zencommunity')}</span>}
            {action}
        </div>
    </header>
);

export const GroupSettingsNav = ({ sections }) => {
    const [active, setActive] = useState(sections[0]?.id);

    // Highlight the section nearest the top of the viewport.
    useEffect(() => {
        const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean);
        if (!els.length || typeof IntersectionObserver === 'undefined') return undefined;
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) setActive(visible[0].target.id);
            },
            { rootMargin: '-90px 0px -60% 0px', threshold: 0 }
        );
        els.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [sections.map((s) => s.id).join(',')]);

    const go = (id) => {
        setActive(id);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <nav className="zc-gs-nav" aria-label={__('Group settings sections', 'zencommunity')}>
            <span className="zc-gs-nav__label">{__('Settings', 'zencommunity')}</span>
            {sections.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" className={`zc-gs-nav__item${active === id ? ' is-active' : ''}`} onClick={() => go(id)}>
                    {Icon && <Icon className="zc-gs-nav__icon" />}
                    <span>{label}</span>
                </button>
            ))}
        </nav>
    );
};

export const GroupSettingsSection = ({ id, icon: Icon, title, subtitle, children, flush = false }) => (
    <section id={id} className="zc-gs-section">
        <div className="zc-gs-section__head">
            {Icon && <span className="zc-gs-section__icon"><Icon /></span>}
            <div>
                <h2 className="zc-gs-section__title">{title}</h2>
                {subtitle && <p className="zc-gs-section__subtitle">{subtitle}</p>}
            </div>
        </div>
        <div className={`zc-gs-section__body${flush ? ' is-flush' : ''}`}>{children}</div>
    </section>
);
