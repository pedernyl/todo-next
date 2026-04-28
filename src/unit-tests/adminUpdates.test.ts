import { vi, describe, it, expect, beforeEach } from 'vitest';

// Hoisted mocks so they are available inside vi.mock factories
const {
  updatesInsertMock,
  updatesDeleteEqMock,
  updatesMaybeSingleMock,
} = vi.hoisted(() => ({
  updatesInsertMock: vi.fn(() => Promise.resolve({ error: null })),
  updatesDeleteEqMock: vi.fn(() => Promise.resolve({ error: null })),
  updatesMaybeSingleMock: vi.fn(() => Promise.resolve({ data: null, error: null })),
}));

// Mock registry before importing the module under test
vi.mock('../lib/adminUpdates/updates/registry', () => ({
  adminUpdateRegistry: [
    {
      fileName: 'testUpdate_1700000000.ts',
      module: {
        runAdminUpdate: vi.fn(async () => ({ message: 'Test update executed' }))
      }
    },
    {
      fileName: 'anotherUpdate_1600000000.ts',
      module: {
        default: vi.fn(async () => ({ message: 'Another update executed' }))
      }
    }
  ]
}));

// Mock supabaseAdminClient
vi.mock('../lib/supabaseAdminClient', () => {
  return {
    supabaseAdmin: {
      from: vi.fn((table: string) => {
        if (table === 'Users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { id: 1 }, error: null })
              })
            })
          };
        }
        if (table === 'Updates') {
          return {
            select: () => ({
              in: () => Promise.resolve({ data: [], error: null }),
              eq: () => ({
                maybeSingle: updatesMaybeSingleMock
              })
            }),
            insert: updatesInsertMock,
            delete: () => ({ eq: updatesDeleteEqMock }),
            upsert: () => Promise.resolve({ error: null })
          };
        }
        return {};
      })
    },
    hasSupabaseServiceRole: true
  };
});

// Mock allowedUsers
vi.mock('../lib/allowedUsers', () => ({
  isAllowedUserEmail: (email: string) => email === 'allowed@example.com'
}));

import {
  listAdminUpdates,
  runAdminUpdateOnce,
  runAdminUpdateForce,
} from '../lib/adminUpdates';


describe('Admin Updates Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseAdminUpdateFileName and file listing', () => {
    it('parses update filenames with timestamps correctly', async () => {
      const updates = await listAdminUpdates();
      
      const testUpdate = updates.find(u => u.fileName === 'testUpdate_1700000000.ts');
      expect(testUpdate).toBeDefined();
      expect(testUpdate?.updateKey).toBe('testUpdate');
      expect(testUpdate?.createdUnixTimestamp).toBe(1700000000);
    });

    it('sorts updates by timestamp descending', async () => {
      const updates = await listAdminUpdates();
      
      expect(updates[0].fileName).toBe('testUpdate_1700000000.ts');
      expect(updates[1].fileName).toBe('anotherUpdate_1600000000.ts');
    });

    it('includes all registered update files', async () => {
      const updates = await listAdminUpdates();
      expect(updates.length).toBe(2);
      expect(updates.every(u => u.fileName)).toBe(true);
    });
  });

  describe('listAdminUpdates', () => {
    it('returns updates with all required properties', async () => {
      const updates = await listAdminUpdates();
      
      expect(updates).toHaveLength(2);
      updates.forEach(update => {
        expect(update).toHaveProperty('fileName');
        expect(update).toHaveProperty('updateKey');
        expect(update).toHaveProperty('createdUnixTimestamp');
        expect(update).toHaveProperty('hasBeenExecuted');
        expect(update).toHaveProperty('beenExecutedBy');
        expect(update).toHaveProperty('beenExecutedTimestamp');
      });
    });

    it('marks updates as not executed when no execution record exists', async () => {
      const updates = await listAdminUpdates();
      
      updates.forEach(update => {
        expect(update.hasBeenExecuted).toBe(false);
        expect(update.beenExecutedBy).toBeNull();
        expect(update.beenExecutedTimestamp).toBeNull();
      });
    });
  });

  describe('runAdminUpdateOnce auth and execution', () => {
    it('throws error if user email is not allowed', async () => {
      await expect(
        runAdminUpdateOnce('testUpdate', 'testUpdate_1700000000.ts', 'notallowed@example.com')
      ).rejects.toThrow('not allowed to execute admin updates');
    });

    it('executes update for authorized user', async () => {
      const result = await runAdminUpdateOnce('testUpdate', 'testUpdate_1700000000.ts', 'allowed@example.com');
      expect(result).toBeDefined();
      expect(result.message).toBe('Test update executed');
    });

    it('throws with execution details when update is already claimed (lock conflict)', async () => {
      updatesInsertMock.mockResolvedValueOnce({ error: { message: 'duplicate key value violates unique constraint' } });
      updatesMaybeSingleMock.mockResolvedValueOnce({
        data: { id: 'testUpdate_1700000000.ts', been_executed_by: 99, been_executed_timestamp: '2024-01-01T00:00:00.000Z' },
        error: null,
      });

      await expect(
        runAdminUpdateOnce('testUpdate', 'testUpdate_1700000000.ts', 'allowed@example.com')
      ).rejects.toThrow('Update already executed at 2024-01-01T00:00:00.000Z by user id 99');
    });

    it('throws generic lock error when insert fails and no existing execution row is found', async () => {
      updatesInsertMock.mockResolvedValueOnce({ error: { message: 'connection error' } });
      updatesMaybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        runAdminUpdateOnce('testUpdate', 'testUpdate_1700000000.ts', 'allowed@example.com')
      ).rejects.toThrow('Failed to acquire execution lock');
    });

    it('rolls back execution lock and re-throws when update function throws', async () => {
      const { adminUpdateRegistry } = await import('../lib/adminUpdates/updates/registry');
      const runnerMock = adminUpdateRegistry[0].module.runAdminUpdate as ReturnType<typeof vi.fn>;
      runnerMock.mockRejectedValueOnce(new Error('update script failed'));

      await expect(
        runAdminUpdateOnce('testUpdate', 'testUpdate_1700000000.ts', 'allowed@example.com')
      ).rejects.toThrow('update script failed');

      expect(updatesDeleteEqMock).toHaveBeenCalled();
    });
  });

  describe('runAdminUpdateForce behavior', () => {
    it('requires allowed user even for force-run', async () => {
      await expect(
        runAdminUpdateForce('testUpdate', 'testUpdate_1700000000.ts', 'notallowed@example.com')
      ).rejects.toThrow('not allowed to execute admin updates');
    });

    it('executes update when force-run with allowed user', async () => {
      const result = await runAdminUpdateForce('testUpdate', 'testUpdate_1700000000.ts', 'allowed@example.com');
      expect(result).toBeDefined();
      expect(result.message).toBe('Test update executed');
    });
  });

  describe('error handling for invalid updates', () => {
    it('throws error when update key does not match filename pattern', async () => {
      await expect(
        runAdminUpdateOnce('wrongKey', 'testUpdate_1700000000.ts', 'allowed@example.com')
      ).rejects.toThrow('Update key mismatch');
    });

    it('throws error when update module is not registered', async () => {
      await expect(
        runAdminUpdateOnce('someUpdate', 'someUpdate_1700000000.ts', 'allowed@example.com')
      ).rejects.toThrow('No admin update file found');
    });
  });
});
