import { useEffect, useId, useRef, type ReactNode } from 'react';
import { containDialogFocus } from './dialogFocus';

/** Native modality supplies focus trapping, background isolation and Escape. */
export default function Modal({ children, onClose, label, className = '' }: {
    children: ReactNode; onClose: () => void; label: string; className?: string;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const labelId = useId();
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; }, [onClose]);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const dialog = ref.current!;
        dialog.showModal();
        const cancel = (event: Event) => { event.preventDefault(); closeRef.current(); };
        dialog.addEventListener('cancel', cancel);
        dialog.addEventListener('keydown', containDialogFocus);
        return () => {
            dialog.removeEventListener('cancel', cancel);
            dialog.removeEventListener('keydown', containDialogFocus);
            dialog.close();
            if (previous?.isConnected) previous.focus();
        };
    }, []);
    return <dialog ref={ref} className={`app-modal ${className}`} aria-labelledby={labelId}
        onClick={event => { if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
        } }}>
        <span className="sr-only" id={labelId}>{label}</span>
        {children}
    </dialog>;
}
