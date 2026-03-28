'use client';

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface HoverPopoverProps {
    /** The trigger element content. */
    trigger: ReactNode;
    /** The popover body content. */
    children: ReactNode;
    /** Extra classes for the trigger wrapper. */
    className?: string;
    /** Width class for the popover (default: w-72). */
    width?: string;
}

/**
 * Generic hover/focus popover with portal rendering and smart positioning.
 * Shows above the trigger when there's room, below otherwise.
 */
export function HoverPopover({
    trigger,
    children,
    className = '',
    width = 'w-72',
}: HoverPopoverProps) {
    const [open, setOpen] = useState(false);
    const [above, setAbove] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLSpanElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const show = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const preferAbove = rect.top >= 200;
            setAbove(preferAbove);
            setPos({
                top: preferAbove ? rect.top : rect.bottom,
                left: rect.left + rect.width / 2,
            });
        }
        setOpen(true);
    }, []);

    const hide = useCallback(() => {
        timeoutRef.current = setTimeout(() => setOpen(false), 150);
    }, []);

    const cancelHide = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <span className={`relative inline-block ${className}`}>
            <span
                ref={triggerRef}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
                tabIndex={0}
                className="cursor-help"
            >
                {trigger}
            </span>

            {open &&
                createPortal(
                    <div
                        onMouseEnter={cancelHide}
                        onMouseLeave={hide}
                        style={{
                            position: 'fixed',
                            top: above ? undefined : pos.top + 8,
                            bottom: above ? `calc(100vh - ${pos.top}px + 8px)` : undefined,
                            left: pos.left,
                            transform: 'translateX(-50%)',
                        }}
                        className={`z-50 ${width} rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-3 space-y-2`}
                    >
                        <span
                            className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${above
                                    ? '-bottom-[7px] border-t-0 border-l-0'
                                    : '-top-[7px] border-b-0 border-r-0'
                                }`}
                        />
                        {children}
                    </div>,
                    document.body,
                )}
        </span>
    );
}
