import Realm from 'realm';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { realm } from './realm';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_URL = 'https://luovxmspvxafbckbtkck.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1b3Z4bXNwdnhhZmJja2J0a2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjYxNjAsImV4cCI6MjA2NTkwMjE2MH0.qvNmONh5i7iMaNdLBmyrGTBlfgfqpmSUY8GX5XnCSoY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    redirectTo: 'myapp://auth/callback',
  },
});

// ---------------- Sync Helpers ---------------- //

const getModelNameForTableName = (tableName) => {
  const map = {
    users: 'User',
    accounts: 'Account',
    contacts: 'Contact',
    transactions: 'Transaction',
  };
  return map[tableName.toLowerCase()] || tableName;
};

const toCamel = (s) => {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase().replace('-', '').replace('_', '');
  });
};

const toSnake = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[A-Z]/g, (letter, index) => {
    return index === 0 ? letter.toLowerCase() : `_${letter.toLowerCase()}`;
  });
};

const transformAccountType = (type) => {
  const typeMap = {
    'cash_in_cash_out': 'cash_in_out',
    'debit_credit': 'debit_credit',
    'receive_send_out': 'receive_send',
    'borrow_lend': 'borrow_lend'
  };
  return typeMap[type] || type;
};

const transformKeysToSnakeCase = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(v => transformKeysToSnakeCase(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      if (key === 'type' || key === 'account_type') {
        result['type'] = transformAccountType(obj[key]);
      } else {
        result[toSnake(key)] = transformKeysToSnakeCase(obj[key]);
      }
      return result;
    }, {});
  }
  return obj;
};

const transformKeysToCamelCase = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(v => transformKeysToCamelCase(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      result[toCamel(key)] = transformKeysToCamelCase(obj[key]);
      return result;
    }, {});
  }
  return obj;
};

// Helper for 500ms delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to check if a string is a UUID
const isUUID = (str) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

// Function to fetch and store code lists from Supabase
export const fetchAndStoreCodeLists = async () => {
  try {
    realm.write(() => {
      realm.delete(realm.objects('CodeList'));
      realm.delete(realm.objects('CodeListElement'));
    });

    const { data: codeLists, error: listsError } = await supabase
      .from('code_lists')
      .select('*')
      .eq('is_active', true);

    if (listsError) throw listsError;

    for (const list of codeLists) {
      const { data: elements, error: elementsError } = await supabase
        .from('code_list_elements')
        .select('*')
        .eq('code_list_name', list.name)
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (elementsError) throw elementsError;

      realm.write(() => {
        realm.create('CodeList', {
          name: list.name,
          description: list.description,
          isActive: list.is_active,
          createdOn: new Date(list.created_on),
          updatedOn: new Date(list.updated_on)
        });

        elements.forEach(element => {
          realm.create('CodeListElement', {
            id: element.id,
            codeListName: element.code_list_name,
            element: element.element,
            description: element.description,
            active: element.active,
            sortOrder: element.sort_order,
            createdOn: new Date(element.created_on),
            updatedOn: new Date(element.updated_on)
          });
        });
      });
    }

    return true;
  } catch (error) {
    console.error('Error fetching and storing code lists:', error);
    return false;
  }
};

export const processSyncLog = async (syncLog, supabaseUserId, schemaName, idMapping = {}) => {
  console.log(`[SYNC-PROCESS] ==> Processing Log ID: ${syncLog.id}`);
  console.log(`[SYNC-PROCESS] Operation: ${syncLog.operation} for table: ${syncLog.tableName} (Schema: ${schemaName})`);
  console.log(`[SYNC-PROCESS] Record ID: ${syncLog.recordId}`);
  console.log(`[SYNC-PROCESS] Supabase User ID: ${supabaseUserId}`);

  // Ensure idMapping has all required structures
  idMapping.users = idMapping.users || {};
  idMapping.accounts = idMapping.accounts || {};
  idMapping.contacts = idMapping.contacts || {};
  idMapping.transactions = idMapping.transactions || {};

  console.log(`[SYNC-PROCESS] Current ID mappings state:`, JSON.stringify(idMapping, null, 2));

  try {
    const { tableName, recordId, operation } = syncLog;
    console.log(`[SYNC-PROCESS] Fetching local record from Realm: ${schemaName} with ID: ${recordId}`);

    const record = realm.objectForPrimaryKey(schemaName, recordId);

    if (!record && operation !== 'delete') {
      console.error(`[SYNC-PROCESS] CRITICAL: Record with ID ${recordId} not found in Realm schema ${schemaName} for a non-delete operation.`);
      return false;
    }

    const data = record ? { ...record.toJSON() } : {};
    delete data._id;
    delete data.needsUpload;
    delete data.syncStatus;
    delete data.supabaseId;
    delete data.passwordHash;

    const snakeCaseData = transformKeysToSnakeCase(data);
    // Ensure parent_transaction_id is null if empty string
    if (snakeCaseData.parent_transaction_id === '') {
      snakeCaseData.parent_transaction_id = null;
    }
    if (snakeCaseData.remind_to_contact_type === '') {
      snakeCaseData.remind_to_contact_type = null;
    }
    if (snakeCaseData.remind_me_type === '') {
      snakeCaseData.remind_me_type = null;
    }
    console.log('[SYNC-PROCESS] Original data (camelCase):', JSON.stringify(data, null, 2));
    console.log('[SYNC-PROCESS] Transformed data for Supabase (snake_case):', JSON.stringify(snakeCaseData, null, 2));

    let result;

    switch (operation) {
      case 'create':
        if (tableName === 'users') {
          console.log(`[SYNC-PROCESS] Handling user as UPDATE for ID: ${supabaseUserId}`);
          delete snakeCaseData.id;

          const updateData = {
            ...snakeCaseData,
            user_type: 'paid',
            email_confirmed: true
          };

          await delay(500); // 500ms delay
          result = await supabase.from(tableName)
            .update(updateData)
            .eq('id', supabaseUserId)
            .select()
            .single();

          if (result.error) throw result.error;

          realm.write(() => {
            const oldRecord = realm.objectForPrimaryKey(schemaName, recordId);
            if (oldRecord) realm.delete(oldRecord);

            const freshData = {
              ...transformKeysToCamelCase(result.data),
              id: supabaseUserId,
              supabaseId: supabaseUserId,
              syncStatus: 'synced',
              lastSyncAt: new Date(),
              needsUpload: false
            };
            realm.create(schemaName, freshData, Realm.UpdateMode.Modified);
            console.log(`[SYNC-PROCESS] Replaced local User ${recordId} with Supabase ID ${supabaseUserId}`);
          });

          // Store the user ID mapping
          idMapping.users[recordId] = supabaseUserId;
          console.log(`[SYNC-PROCESS] User ID mapping: ${recordId} -> ${supabaseUserId}`);

          return true;
        } else {
          console.log(`[SYNC-PROCESS] Sending CREATE request to Supabase table: ${tableName}`);
          const oldId = snakeCaseData.id;

          // For transactions, generate a proper UUID instead of timestamp ID
          if (tableName === 'transactions') {
            const newTransactionId = uuidv4();
            console.log(`[SYNC-PROCESS] Generated new transaction ID: ${newTransactionId}`);

            // Validate required fields with clear error messages
            if (!snakeCaseData.account_id) {
              throw new Error('Transaction sync failed: Missing account_id');
            }
            if (!snakeCaseData.type) {
              throw new Error('Transaction sync failed: Missing transaction type');
            }
            if (!snakeCaseData.amount) {
              throw new Error('Transaction sync failed: Missing amount');
            }
            // Transform transaction type to match Supabase enum
            snakeCaseData.type = snakeCaseData.type

            // Map account_id using idMapping
            if (snakeCaseData.account_id) {
              const mappedAccountId = idMapping.accounts[snakeCaseData.account_id];
              if (mappedAccountId) {
                console.log(`[SYNC-PROCESS] Mapping account ID: ${snakeCaseData.account_id} -> ${mappedAccountId}`);
                snakeCaseData.account_id = mappedAccountId;
              } else {
                // Check if the account_id is already a Supabase ID (UUID format)
                if (!isUUID(snakeCaseData.account_id)) {
                  console.error(`[SYNC-PROCESS] Account ID mapping not found for: ${snakeCaseData.account_id}`);
                  console.error(`[SYNC-PROCESS] Available account mappings:`, JSON.stringify(idMapping.accounts, null, 2));
                  throw new Error(`Account ID ${snakeCaseData.account_id} not found in ID mapping`);
                }
                // If it's already a UUID, assume it's already been mapped
                console.log(`[SYNC-PROCESS] Account ID appears to be already mapped: ${snakeCaseData.account_id}`);
              }
            } else {
              throw new Error('Transaction sync failed: Missing account_id');
            }

            // Map contact_id using idMapping if exists
            if (snakeCaseData.contact_id) {
              const mappedContactId = idMapping.contacts[snakeCaseData.contact_id];
              if (mappedContactId) {
                console.log(`[SYNC-PROCESS] Mapping contact ID: ${snakeCaseData.contact_id} -> ${mappedContactId}`);
                snakeCaseData.contact_id = mappedContactId;
              } else {
                // Check if the contact_id is already a Supabase ID (UUID format)
                if (!isUUID(snakeCaseData.contact_id)) {
                  console.warn(`[SYNC-PROCESS] Contact ID mapping not found for: ${snakeCaseData.contact_id} - removing contact reference`);
                  delete snakeCaseData.contact_id;
                } else {
                  console.log(`[SYNC-PROCESS] Contact ID appears to be already mapped: ${snakeCaseData.contact_id}`);
                }
              }
            }

            // Set the new ID
            snakeCaseData.id = newTransactionId;
          } else {
            delete snakeCaseData.id; // Let Supabase generate the new ID
          }

          // Update foreign keys using ID mapping
          if (tableName === 'accounts' || tableName === 'contacts' || tableName === 'transactions') {
            snakeCaseData.user_id = supabaseUserId;
          }

          // For non-transaction tables, handle ID mapping here
          if (tableName === 'accounts' || tableName === 'contacts') {
            // No additional ID mapping needed for accounts/contacts during creation
            console.log(`[SYNC-PROCESS] Creating ${tableName} with user_id: ${supabaseUserId}`);
          }

          await delay(500); // 500ms delay
          result = await supabase.from(tableName).insert(snakeCaseData).select().single();

          if (result.error) {
            console.error('[SYNC-PROCESS] Supabase CREATE failed:', result.error.message);
            console.error('Request Body was:', JSON.stringify(snakeCaseData, null, 2));
            throw result.error;
          }
          if (!result.data) throw new Error('Create operation did not return data from Supabase.');

          console.log('[SYNC-PROCESS] Supabase create result:', result.data);
          const newRealmData = transformKeysToCamelCase(result.data);

          realm.write(() => {
            const oldRecord = realm.objectForPrimaryKey(schemaName, recordId);
            if (oldRecord) realm.delete(oldRecord);

            const finalData = {
              ...newRealmData,
              syncStatus: 'synced',
              lastSyncAt: new Date(),
              needsUpload: false,
            };
            realm.create(schemaName, finalData, Realm.UpdateMode.Modified);
            console.log(`[SYNC-PROCESS] Successfully replaced local record ${recordId} with new Supabase record ${finalData.id}`);
          });

          // Store the ID mapping for future reference
          const newSupabaseId = result.data.id;
          if (tableName === 'accounts') {
            idMapping.accounts[oldId] = newSupabaseId;
            console.log(`[SYNC-PROCESS] Account ID mapping: ${oldId} -> ${newSupabaseId}`);
          } else if (tableName === 'contacts') {
            idMapping.contacts[oldId] = newSupabaseId;
            console.log(`[SYNC-PROCESS] Contact ID mapping: ${oldId} -> ${newSupabaseId}`);
          } else if (tableName === 'transactions') {
            idMapping.transactions[oldId] = newSupabaseId;
            console.log(`[SYNC-PROCESS] Transaction ID mapping: ${oldId} -> ${newSupabaseId}`);
          }

          return true;
        }

      case 'update':
        console.log(`[SYNC-PROCESS] Sending UPDATE request to Supabase table: ${tableName} for ID: ${recordId}`);

        // Update foreign keys using ID mapping
        if (tableName === 'accounts' || tableName === 'contacts' || tableName === 'transactions') {
          snakeCaseData.user_id = supabaseUserId;
        }

        if (tableName === 'transactions') {
          // Map account_id using idMapping
          if (snakeCaseData.account_id) {
            const mappedAccountId = idMapping.accounts[snakeCaseData.account_id];
            if (mappedAccountId) {
              console.log(`[SYNC-PROCESS] Mapping account ID for update: ${snakeCaseData.account_id} -> ${mappedAccountId}`);
              snakeCaseData.account_id = mappedAccountId;
            } else if (!isUUID(snakeCaseData.account_id)) {
              console.error(`[SYNC-PROCESS] Account ID mapping not found for update: ${snakeCaseData.account_id}`);
              console.error(`[SYNC-PROCESS] Available account mappings:`, JSON.stringify(idMapping.accounts, null, 2));
              throw new Error(`Account ID ${snakeCaseData.account_id} not found in ID mapping for update`);
            }
          }

          // Map contact_id using idMapping if exists
          if (snakeCaseData.contact_id) {
            const mappedContactId = idMapping.contacts[snakeCaseData.contact_id];
            if (mappedContactId) {
              console.log(`[SYNC-PROCESS] Mapping contact ID for update: ${snakeCaseData.contact_id} -> ${mappedContactId}`);
              snakeCaseData.contact_id = mappedContactId;
            } else if (!isUUID(snakeCaseData.contact_id)) {
              console.warn(`[SYNC-PROCESS] Contact ID mapping not found for update: ${snakeCaseData.contact_id} - removing contact reference`);
              delete snakeCaseData.contact_id;
            }
          }
        }

        await delay(500); // 500ms delay
        result = await supabase.from(tableName).update(snakeCaseData).eq('id', recordId).select().single();

        if (result.error) {
          console.error('[SYNC-PROCESS] Supabase UPDATE failed:', result.error.message);
          console.error('Request Body was:', JSON.stringify(snakeCaseData, null, 2));
          throw result.error;
        }

        realm.write(() => {
          const oldRecord = realm.objectForPrimaryKey(schemaName, recordId);
          if (oldRecord) realm.delete(oldRecord);

          const finalData = {
            ...transformKeysToCamelCase(result.data),
            syncStatus: 'synced',
            lastSyncAt: new Date(),
            needsUpload: false,
          };
          realm.create(schemaName, finalData, Realm.UpdateMode.Modified);
          console.log(`[SYNC-PROCESS] Updated local record ${recordId} with Supabase data`);
        });
        return true;

      case 'delete':
        console.log('[SYNC-PROCESS] Deleting record from Supabase with ID:', recordId);
        await delay(500); // 500ms delay
        result = await supabase.from(tableName).delete().eq('id', recordId);

        if (result.error) {
          console.error('[SYNC-PROCESS] Supabase DELETE failed:', result.error.message);
          throw result.error;
        }

        realm.write(() => {
          const oldRecord = realm.objectForPrimaryKey(schemaName, recordId);
          if (oldRecord) realm.delete(oldRecord);
          console.log(`[SYNC-PROCESS] Deleted local record ${recordId}`);
        });
        return true;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.error(`[SYNC-PROCESS] Error processing ${syncLog.tableName}/${syncLog.recordId}:`, error);
    return false;
  }
};

export const syncPendingChanges = async (realmUserId, onProgress = () => { }) => {
  console.log(`[SYNC] ===== Starting Full Sync for Realm User ID: ${realmUserId} =====`);

  // First check if there are any pending/failed sync logs
  const pendingLogsPlain = realm.objects('SyncLog').filtered(
    '(status == "pending" OR status == "failed") AND userId == $0',
    realmUserId
  ).sorted('createdOn');

  console.log('[SYNC] Found pending/failed logs:', pendingLogsPlain.length, pendingLogsPlain.slice(0, 5).map(log => ({ id: log.id, status: log.status, tableName: log.tableName })));

  if (pendingLogsPlain.length === 0) {
    console.log('[SYNC] DEBUG: pendingLogsPlain is empty, nothing to sync.');
    console.log('[SYNC] No pending or failed sync logs found - nothing to sync');
    return { total: 0, success: 0, failed: 0 };
  }

  const realmUser = realm.objectForPrimaryKey('User', realmUserId);
  if (!realmUser || !realmUser.supabaseId) {
    console.log('[SYNC] No matching Realm user found or user is missing supabaseId.');
    return { total: 0, success: 0, failed: 0 };
  }

  // Sort logs by table dependency order: users -> accounts -> contacts -> transactions
  const pendingLogs = Array.from(pendingLogsPlain).map(log => log.toJSON());
  const tablePriority = { users: 0, accounts: 1, contacts: 2, transactions: 3 };
  pendingLogs.sort((a, b) => {
    const priorityA = tablePriority[a.tableName] || 999;
    const priorityB = tablePriority[b.tableName] || 999;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // If same table, sort by operation: create -> update -> delete
    const opPriority = { create: 0, update: 1, delete: 2 };
    return (opPriority[a.operation] || 999) - (opPriority[b.operation] || 999);
  });

  const total = pendingLogs.length;
  let successCount = 0;
  let failedCount = 0;

  // ID mapping to track old->new ID relationships
  const idMapping = {
    users: {},
    accounts: {},
    contacts: {},
    transactions: {}
  };

  for (let i = 0; i < total; i++) {
    const log = pendingLogs[i];
    const current = i + 1;
    const schemaName = getModelNameForTableName(log.tableName);

    try {
      onProgress({ current, total, message: `Processing ${log.tableName} (${log.operation})` });
      console.log(`[SYNC] Processing ${current}/${total}: ${log.tableName} (${log.operation}) - Record ID: ${log.recordId}`);

      const result = await processSyncLog(log, realmUser.supabaseId, schemaName, idMapping);

      if (result === true) {
        const logToUpdate = realm.objectForPrimaryKey('SyncLog', log.id);
        if (logToUpdate) {
          realm.write(() => {
            logToUpdate.status = 'completed';
            logToUpdate.lastSyncAt = new Date();
          });
        }
        successCount++;
        console.log(`[SYNC] ✅ Successfully processed ${log.tableName}/${log.recordId}`);
        console.log(`[SYNC] Updated ID mappings after processing ${log.tableName}:`, JSON.stringify(idMapping, null, 2));
      } else {
        console.warn(`[SYNC] ❌ Failed to process Log ID: ${log.id}, marking as failed`);
        failedCount++;
        const logToUpdate = realm.objectForPrimaryKey('SyncLog', log.id);
        if (logToUpdate) {
          realm.write(() => {
            logToUpdate.status = 'failed';
            logToUpdate.error = 'Sync process failed';
          });
        }
      }
    } catch (error) {
      console.error(`[SYNC] ❌ FAILED to process Log ID: ${log.id}. Error:`, error);
      failedCount++;
      const logToUpdate = realm.objectForPrimaryKey('SyncLog', log.id);
      if (logToUpdate) {
        realm.write(() => {
          logToUpdate.status = 'failed';
          logToUpdate.error = error.message;
        });
      }
    }
  }

  console.log(`[SYNC] ===== Sync Complete =====`);
  console.log(`[SYNC] Total: ${total}, Success: ${successCount}, Failed: ${failedCount}`);
  console.log(`[SYNC] Final ID Mappings:`, JSON.stringify(idMapping, null, 2));

  return { total, success: successCount, failed: failedCount, idMapping };
};

/**
 * Create a transaction directly in Supabase.
 * @param {object} transactionData - Transaction data in camelCase (as in Realm).
 * @param {string} supabaseUserId - The Supabase user UUID.
 * @param {object} idMapping - { accounts: {}, contacts: {} } for mapping local IDs to Supabase IDs.
 * @returns {Promise<object>} - The created transaction from Supabase, or throws error.
 */
export async function createTransactionInSupabase(transactionData, supabaseUserId, idMapping = {}) {
  // Convert camelCase to snake_case for Supabase
  let snakeCaseData = transformKeysToSnakeCase({ ...transactionData });

  // Remove fields not present in Supabase schema
  delete snakeCaseData.needs_upload;
  delete snakeCaseData.sync_status;
  delete snakeCaseData.last_sync_at;
  delete snakeCaseData.created_on; // optional: let Supabase default
  delete snakeCaseData.updated_on; // optional: let Supabase default

  // Map account_id and contact_id using idMapping if needed
  if (snakeCaseData.account_id && idMapping.accounts && idMapping.accounts[snakeCaseData.account_id]) {
    snakeCaseData.account_id = idMapping.accounts[snakeCaseData.account_id];
  }
  if (snakeCaseData.contact_id && idMapping.contacts && idMapping.contacts[snakeCaseData.contact_id]) {
    snakeCaseData.contact_id = idMapping.contacts[snakeCaseData.contact_id];
  }
  if (snakeCaseData.on_behalf_of_contact_id && idMapping.contacts && idMapping.contacts[snakeCaseData.on_behalf_of_contact_id]) {
    snakeCaseData.on_behalf_of_contact_id = idMapping.contacts[snakeCaseData.on_behalf_of_contact_id];
  }

  // Set user_id
  snakeCaseData.user_id = supabaseUserId;

  // Ensure proxy fields are present
  if (!('is_proxy_payment' in snakeCaseData)) snakeCaseData.is_proxy_payment = false;
  if (!('on_behalf_of_contact_id' in snakeCaseData)) snakeCaseData.on_behalf_of_contact_id = null;

  // Remove id so Supabase generates a UUID
  delete snakeCaseData.id;

  // Insert into Supabase
  const { data, error } = await supabase
    .from('transactions')
    .insert(snakeCaseData)
    .select()
    .single();

  if (error) throw error;
  return data;
}