/** Keep Tab within an open dialog; native showModal handles background isolation. */
export function containDialogFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const dialog = event.currentTarget as HTMLDialogElement;
    const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
        .filter(control => control.getClientRects().length > 0 && !control.closest('[inert]'));
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
