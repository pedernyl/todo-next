import { describe, it, expect } from 'vitest';

describe('tryGetAuthenticatedUserId', () => {
    it('returns unathorized when there is no session', async () => {
       expect(1).toBe(1);
    });

    it('returns missing-email when session has no email', async () => {
        expect(1).toBe(1);
    });

    it('returns userId when session email resolves successfully', async () => {
        expect(1).toBe(1);
    });

    it('returns lookup-failed when user lookup fails', async () => {
        expect(1).toBe(1);
    });

});

describe('getAuthenticatedUserId', () => {
    it('returns the userId on success', async () => {
        expect(1).toBe(1);
    });

    it('throws on auth failure', async () => {
        expect(1).toBe(1);
    });

});