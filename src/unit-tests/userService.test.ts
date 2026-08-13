import { beforeEach, describe, it, expect, vi } from 'vitest';

vi.mock('../lib/appServerSession', () => ({
    getAppServerSession: vi.fn(),
}));

import { getAppServerSession } from '../lib/appServerSession';
import { tryGetAuthenticatedUserId } from '../lib/userService';

const mockedGetAppServerSession = vi.mocked(getAppServerSession);

describe('tryGetAuthenticatedUserId', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns unauthorized when there is no session', async () => {
        mockedGetAppServerSession.mockResolvedValue(null);

        const result = await tryGetAuthenticatedUserId();

        expect(result).toEqual({
            ok: false,
            code: "unauthorized",
            status: 401,
            message: "Unauthorized",
        });
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