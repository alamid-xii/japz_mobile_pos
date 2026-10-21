import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import Modal from './Modal';

interface FeedbackContextValue {
    notify: (message: string) => void;
    confirmAction: (message: string) => Promise<boolean>;
}
const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
    const [message, setMessage] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
    const finish = (confirmed: boolean) => {
        resolveRef.current?.(confirmed);
        resolveRef.current = null;
        setConfirmation('');
    };
    return <FeedbackContext.Provider value={{ notify: setMessage, confirmAction: text => {
        resolveRef.current?.(false);
        setConfirmation(text);
        return new Promise(resolve => { resolveRef.current = resolve; });
    } }}>
        {children}
        {message && <Modal label="Notice" onClose={() => setMessage('')} className="app-confirmation">
            <h2>Notice</h2><p role="status">{message}</p>
            <div className="app-dialog-actions"><button autoFocus type="button" className="bg-brand" onClick={() => setMessage('')}>OK</button></div>
        </Modal>}
        {confirmation && <Modal label="Confirm action" onClose={() => finish(false)} className="app-confirmation">
            <h2>Confirm action</h2>
            <p>{confirmation}</p>
            <div className="app-dialog-actions">
                <button type="button" autoFocus onClick={() => finish(false)}>Cancel</button>
                <button type="button" className="bg-brand" onClick={() => finish(true)}>Confirm</button>
            </div>
        </Modal>}
    </FeedbackContext.Provider>;
}

// Context and provider intentionally share this small module.
// eslint-disable-next-line react-refresh/only-export-components
export function useFeedback() {
    const value = useContext(FeedbackContext);
    if (!value) throw new Error('useFeedback requires FeedbackProvider');
    return value;
}
