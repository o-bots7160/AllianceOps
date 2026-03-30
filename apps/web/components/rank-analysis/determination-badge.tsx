import { DETERMINATION_LABELS } from './constants';

interface DeterminationBadgeProps {
    determination: string;
    className?: string;
}

export function DeterminationBadge({ determination, className = '' }: DeterminationBadgeProps) {
    const detLabel = DETERMINATION_LABELS[determination];
    return (
        <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold text-center ${detLabel?.color ?? ''} ${className}`}
        >
            {detLabel?.label ?? determination}
        </span>
    );
}
