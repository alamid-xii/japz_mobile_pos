import { useEffect } from 'react';
import { X } from 'lucide-react';
import Modal from './Modal';

interface Props {
    isOpen: boolean; type: 'success' | 'error' | 'confirm'; title: string; message: string;
    onClose: () => void; onConfirm?: () => void; confirmButtonLabel?: string;
    confirmButtonColor?: 'red' | 'amber' | 'blue';
}
/** Shared feedback for the existing menu and promotion flows. */
export default function ActionNotice({ isOpen, type, title, message, onClose, onConfirm, confirmButtonLabel = 'Delete', confirmButtonColor = 'red' }: Props) {
    useEffect(() => {
        if (!isOpen || type !== 'success') return;
        const timer = window.setTimeout(onClose, 6000);
        return () => window.clearTimeout(timer);
    }, [isOpen, type, onClose]);
    if (!isOpen) return null;
    if (type === 'success') return <div role="status" className="app-notification">
        <div><p className="font-semibold">{title}</p><p>{message}</p></div>
        <button type="button" onClick={onClose} aria-label="Dismiss notification"><X size={18} /></button>
    </div>;
    return <Modal label={title} onClose={onClose} className="app-confirmation">
        <h2>{title}</h2><p>{message}</p>
        <div className="app-dialog-actions">
            {type === 'confirm' ? <>
                <button autoFocus type="button" onClick={onClose}>Cancel</button>
                <button type="button" className={confirmButtonColor === 'red' ? 'bg-red-600 text-white' : confirmButtonColor === 'blue' ? 'bg-blue-700 text-white' : 'bg-brand text-brand-dark'} onClick={() => { onConfirm?.(); onClose(); }}>{confirmButtonLabel}</button>
            </> : <button autoFocus type="button" className="bg-brand" onClick={onClose}>OK</button>}
        </div>
    </Modal>;
}
