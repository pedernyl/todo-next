import { beforeEach, describe, it, expect, vi } from 'vitest';
import { API_MESSAGES } from '../constants/api/apiMessages';

vi.mock('../lib/appServerSession', () => ({
    getAppServerSession: vi.fn(),
}));

import { getAppServerSession } from '../lib/appServerSession';
import { getAuthenticatedUserIdResponse, getAuthenticatedUserId } from '../lib/userService';

const mockedGetAppServerSession = vi.mocked(getAppServerSession);

describe('getAuthenticatedUserIdResponse', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns unauthorized when there is no session', async () => {
        mockedGetAppServerSession.mockResolvedValue(null);

        const result = await getAuthenticatedUserIdResponse();

        expect(result).toEqual({
            ok: false,
            status: 401,
            message: API_MESSAGES.COMMON.UNAUTHORIZED,
            data: null,
        });
    });

    it('returns missing-email when session has no email', async () => {
        mockedGetAppServerSession.mockResolvedValueOnce({ user: { } } as never);

        const result = await getAuthenticatedUserIdResponse();

        expect(result).toEqual({
            ok: false,
            status: 400,
            message: API_MESSAGES.USER.MISSING_EMAIL,
            data: null,
        });      
        
    });

    it('returns userId when session email resolves successfully', async () => {
       mockedGetAppServerSession.mockResolvedValueOnce({ 
        user: { email: 'test@example.com' },
        } as never);

        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                json: async () => ({ userId: 123 }),
            }))
        );
        
        await expect(getAuthenticatedUserIdResponse()).resolves.toEqual({
            ok: true,
            status: 200,
            data: 123,
        });
    });

    it('returns lookup-failed when user lookup fails', async () => {
        mockedGetAppServerSession.mockResolvedValueOnce({ 
            user: { email: 'test@example.com' },
        } as never);

        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: false,
            }))
        );

        const result = await getAuthenticatedUserIdResponse();

        expect(result).toEqual({
            ok: false,
            status: 500,
            message: API_MESSAGES.USER.USER_ID_LOOKUP_FAILED,
            data: null,
        });
    });

});

describe('getAuthenticatedUserId', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns the userId on success', async () => {
        mockedGetAppServerSession.mockResolvedValueOnce({
            user: { email: 'test@example    .com' },
        } as never);

        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                json: async () => ({ userId: 123 }),
            }))
        );

        const result = await getAuthenticatedUserId();
        expect(result).toBe(123);
    });

    it('throws on auth failure', async () => {
        mockedGetAppServerSession.mockResolvedValueOnce(null);

        await expect(getAuthenticatedUserId()).rejects.toThrow(API_MESSAGES.COMMON.UNAUTHORIZED);
    });

});