import { beforeEach, describe, it, expect, vi } from 'vitest';
import { API_MESSAGES } from '../constants/api/apiMessages';

vi.mock('../lib/appServerSession', () => ({
    getAppServerSession: vi.fn(),
}));

vi.mock('../lib/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

import { getAppServerSession } from '../lib/appServerSession';
import { supabase } from '../lib/supabaseClient';
import { getAuthenticatedUserIdResponse, getAuthenticatedUserId, isAuthenticatedUserByEmail } from '../lib/userService';
import { queryWithTableFallback, shouldFallbackToLegacyTable } from '../lib/tableCompatibility';

const mockedGetAppServerSession = vi.mocked(getAppServerSession);

describe('tableCompatibility', () => {
    it('detects missing-table errors for legacy fallback', () => {
        expect(
            shouldFallbackToLegacyTable(
                { code: '42P01', message: 'relation "public.Users" does not exist' },
                'User'
            )
        ).toBe(true);

        expect(
            shouldFallbackToLegacyTable(
                {
                    code: 'PGRST205',
                    message: 'Could not read from "public."User"" due to schema cache mismatch',
                },
                'User'
            )
        ).toBe(true);
    });

    it('retries the legacy table when the preferred table does not exist', async () => {
        const queryFactory = vi
            .fn()
            .mockResolvedValueOnce({
                data: null,
                error: { code: '42P01', message: 'relation "public.Users" does not exist' },
            })
            .mockResolvedValueOnce({
                data: { id: 123 },
                error: null,
            });

        const result = await queryWithTableFallback(
            queryFactory,
            'Users',
            'User'
        );

        expect(queryFactory).toHaveBeenCalledTimes(2);
        expect(queryFactory).toHaveBeenNthCalledWith(1, 'Users');
        expect(queryFactory).toHaveBeenNthCalledWith(2, 'User');
        expect(result.data).toEqual({ id: 123 });
    });
});

const mockedSupabaseFrom = vi.mocked(supabase.from);

function mockSupabaseSingleResult(data: any, error: any = null) {
    const single = vi.fn().mockResolvedValue({ data, error });
    mockedSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single }),
        }),
    } as any);
    return single;
}

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

        mockSupabaseSingleResult({ id: 123 }, null);
        
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

        mockSupabaseSingleResult(null, { message: 'lookup failed' });

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
            user: { email: 'test@example.com' },
        } as never);

        mockSupabaseSingleResult({ id: 123 }, null);

        const result = await getAuthenticatedUserId();
        expect(result).toBe(123);
    });

    it('throws on auth failure', async () => {
        mockedGetAppServerSession.mockResolvedValueOnce(null);

        await expect(getAuthenticatedUserId()).rejects.toThrow(API_MESSAGES.COMMON.UNAUTHORIZED);
    });

});

describe('isAuthenticatedUserByEmail', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedSupabaseFrom.mockReset();
    });

     it('returns false for a missing email without querying the database', async () => {
        await expect(isAuthenticatedUserByEmail(null)).resolves.toBe(false);
        await expect(isAuthenticatedUserByEmail(undefined)).resolves.toBe(false);
        await expect(isAuthenticatedUserByEmail('')).resolves.toBe(false);
        expect(mockedSupabaseFrom).not.toHaveBeenCalled();
    });

     it('returns true when the email exists in the users table', async () => {
        mockSupabaseSingleResult({ id: 123 }, null);

        await expect(isAuthenticatedUserByEmail('test@example.com')).resolves.toBe(true);
        expect(mockedSupabaseFrom).toHaveBeenCalledWith('Users');
    });

});