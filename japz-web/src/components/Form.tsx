import { useId, useState, type ComponentProps } from 'react';

/** Preserve HTML constraints while presenting errors inside the application. */
export default function Form({ children, onSubmitCapture, ...props }: ComponentProps<'form'>) {
    const errorId = useId();
    const [errors, setErrors] = useState<string[]>([]);
    return <form {...props} noValidate onSubmitCapture={event => {
        const controls = Array.from(event.currentTarget.elements).filter(
            (control): control is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
                control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement,
        );
        const invalid = controls.filter(control => control.willValidate && !control.validity.valid);
        for (const control of controls) {
            if (invalid.includes(control)) {
                control.setAttribute('aria-invalid', 'true');
                control.setAttribute('aria-errormessage', errorId);
            } else {
                control.removeAttribute('aria-invalid');
                control.removeAttribute('aria-errormessage');
            }
        }
        setErrors(invalid.map(control => `${control.labels?.[0]?.textContent?.trim() || control.getAttribute('aria-label') || 'Field'}: ${control.validationMessage}`));
        if (invalid.length) {
            event.preventDefault();
            event.stopPropagation();
            invalid[0].focus();
        } else onSubmitCapture?.(event);
    }}>
        {errors.length > 0 && <div id={errorId} role="alert" className="app-form-error">
            <p className="font-semibold">Check the following fields</p>
            <ul>{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>
        </div>}
        {children}
    </form>;
}
