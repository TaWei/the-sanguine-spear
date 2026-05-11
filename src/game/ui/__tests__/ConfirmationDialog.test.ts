import { describe, it, expect } from 'vitest';
import { ConfirmationDialog } from '../ConfirmationDialog';

describe('ConfirmationDialog', () => {
  it('starts closed with no confirmation', () => {
    const dialog = new ConfirmationDialog();
    expect(dialog.isOpen).toBe(false);
    expect(dialog.confirmed).toBeNull();
  });

  it('opens and resets confirmation', () => {
    const dialog = new ConfirmationDialog();
    dialog.confirm();
    dialog.open();
    expect(dialog.isOpen).toBe(true);
    expect(dialog.confirmed).toBeNull();
  });

  it('confirm sets confirmed true and closes', () => {
    const dialog = new ConfirmationDialog();
    dialog.open();
    dialog.confirm();
    expect(dialog.isOpen).toBe(false);
    expect(dialog.confirmed).toBe(true);
  });

  it('cancel sets confirmed false and closes', () => {
    const dialog = new ConfirmationDialog();
    dialog.open();
    dialog.cancel();
    expect(dialog.isOpen).toBe(false);
    expect(dialog.confirmed).toBe(false);
  });

  it('reset clears state', () => {
    const dialog = new ConfirmationDialog();
    dialog.open();
    dialog.confirm();
    dialog.reset();
    expect(dialog.isOpen).toBe(false);
    expect(dialog.confirmed).toBeNull();
  });
});
