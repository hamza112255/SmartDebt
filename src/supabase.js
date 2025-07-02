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

const mapSpecificToGenericType = (specificType) => {
  const creditTypes = ['cash_in', 'receive', 'borrow', 'credit'];
  const debitTypes = ['cash_out', 'send_out', 'lend', 'debit'];

  if (creditTypes.includes(specificType)) return 'credit';
  if (debitTypes.includes(specificType)) return 'debit';
  return specificType; // Fallback
};

export const getSpecificTransactionType = (genericType, accountType) => {
  const mapping = {
    'cash_in_out': { 'credit': 'cash_in', 'debit': 'cash_out' },
    'receive_send': { 'credit': 'receive', 'debit': 'send_out' },
    'borrow_lend': { 'credit': 'borrow', 'debit': 'lend' },
    'debit_credit': { 'credit': 'credit', 'debit': 'debit' },
  };
  return mapping[accountType]?.[genericType] || genericType;
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

export const transformKeysToCamelCase = (obj) => {
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
      console.log(`[SYNC-PROCESS] Record with ID ${recordId} for a ${operation} operation was not found in Realm. It was likely deleted. Skipping.`);
      return true; // Treat as success to clear the log
    }

    const data = record ? { ...record.toJSON() } : {};
    delete data._id;
    delete data.needsUpload;
    delete data.syncStatus;
    delete data.supabaseId;
    delete data.passwordHash;
    if (schemaName === 'Account') {
      delete data.showBalance;
    }

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
    if (snakeCaseData.on_behalf_of_contact_id === '') {
      snakeCaseData.on_behalf_of_contact_id = null;
    }
    if (snakeCaseData.contact_id === '') {
      snakeCaseData.contact_id = null;
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

            // --- TYPE MAPPING LOGIC ---
            const accountForTx = realm.objectForPrimaryKey('Account', data.accountId);
            if (accountForTx) {
              // The type from Realm `data.type` is the specific one (e.g., 'cash_in')
              // We need to map it to the generic one for Supabase ('credit')
              const genericType = mapSpecificToGenericType(data.type);
              console.log(`[SYNC-PROCESS] Mapping specific type '${data.type}' to generic type '${genericType}' for Supabase.`);
              snakeCaseData.type = genericType;
            } else {
              console.warn(`[SYNC-PROCESS] Could not find account ${data.accountId} to map transaction type. Using original type: ${snakeCaseData.type}`);
            }
            // --- END TYPE MAPPING ---

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

          if (tableName === 'accounts') {
            snakeCaseData.current_balance = 0;
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

            if (tableName === 'accounts' && operation === 'create') {
              finalData.currentBalance = data.currentBalance;
              finalData.receiving_money = data.receiving_money;
              finalData.sending_money = data.sending_money;
              console.log(`[SYNC-PROCESS] Restored original balances for account ${finalData.id}:`, {
                currentBalance: data.currentBalance,
                receiving_money: data.receiving_money,
                sending_money: data.sending_money
              });
            }
            
            realm.create(schemaName, finalData, Realm.UpdateMode.Modified);
            // --- Update ProxyPayment originalTransactionId if exists ---
            if (tableName === 'transactions') {
              // Find ProxyPayment by old temp transaction ID
              const proxyPayment = realm.objects('ProxyPayment').filtered('originalTransactionId == $0', recordId)[0];
              if (proxyPayment) {
                realm.create('ProxyPayment', {
                  ...proxyPayment.toJSON(),
                  originalTransactionId: finalData.id,
                  updatedOn: new Date()
                }, Realm.UpdateMode.Modified);
              }
            }
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
        const idToUpdate = idMapping[tableName]?.[recordId] || recordId;
        console.log(`[SYNC-PROCESS] Sending UPDATE request to Supabase table: ${tableName} for ID: ${idToUpdate} (local ID was: ${recordId})`);

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

          // --- TYPE MAPPING LOGIC for UPDATE ---
          const accountForTx = realm.objectForPrimaryKey('Account', data.accountId);
          if (accountForTx) {
            const genericType = mapSpecificToGenericType(data.type);
            console.log(`[SYNC-PROCESS] Mapping transaction type for UPDATE from '${data.type}' to '${genericType}' for Supabase.`);
            snakeCaseData.type = genericType;
          } else {
            console.warn(`[SYNC-PROCESS] Could not find account ${data.accountId} to map transaction type for UPDATE. Using original type: ${snakeCaseData.type}`);
          }
          // --- END TYPE MAPPING ---

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
        result = await supabase.from(tableName).update(snakeCaseData).eq('id', idToUpdate).select().single();

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
        const idToDelete = idMapping[tableName]?.[recordId] || recordId;
        console.log(`[SYNC-PROCESS] Deleting record from Supabase with ID: ${idToDelete} (local ID was: ${recordId})`);
        
        await delay(500); // 500ms delay
        result = await supabase.from(tableName).delete().eq('id', idToDelete);

        if (result.error) {
          console.error(`[SYNC-PROCESS] Supabase DELETE failed for ID ${idToDelete}:`, result.error.message);
          throw result.error;
        }

        console.log(`[SYNC-PROCESS] Supabase delete successful for ID ${idToDelete}.`);
        
        // The record is already deleted from Realm when the user performs the action.
        // We just need to make sure the log is cleared.
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
        realm.write(() => {
          const logToDelete = realm.objectForPrimaryKey('SyncLog', log.id);
          if (logToDelete) {
            realm.delete(logToDelete);
          }
        });
        successCount++;
        console.log(`[SYNC] ✅ Successfully processed and deleted SyncLog for ${log.tableName}/${log.recordId}`);
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

/**
 * Delete a transaction directly in Supabase by its ID.
 * @param {string} transactionId - The Supabase transaction UUID.
 * @returns {Promise<boolean>} - True if deleted, throws error otherwise.
 */
export async function deleteTransactionInSupabase(transactionId) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);

  if (error) throw error;
  return true;
}

/**
 * Update a transaction in Supabase by its ID.
 * @param {string} transactionId - The Supabase transaction UUID.
 * @param {object} transactionData - Transaction data in camelCase (as in Realm).
 * @returns {Promise<object>} - The updated transaction from Supabase.
 */
export async function updateTransactionInSupabase(transactionId, transactionData) {
  let snakeCaseData = transformKeysToSnakeCase({ ...transactionData });
  delete snakeCaseData.needs_upload;
  delete snakeCaseData.sync_status;
  delete snakeCaseData.last_sync_at;
  delete snakeCaseData.created_on;
  delete snakeCaseData.updated_on;
  // Don't update id
  delete snakeCaseData.id;

  const { data, error } = await supabase
    .from('transactions')
    .update(snakeCaseData)
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create an account in Supabase.
 * @param {object} accountData - Account data in camelCase.
 * @returns {Promise<object>} - The created account from Supabase.
 */
export async function createAccountInSupabase(accountData) {
  let snakeCaseData = transformKeysToSnakeCase({ ...accountData });
  delete snakeCaseData.needs_upload;
  delete snakeCaseData.sync_status;
  delete snakeCaseData.last_sync_at;
  delete snakeCaseData.created_on;
  delete snakeCaseData.updated_on;
  delete snakeCaseData.id;
  // do NOT delete is_active
  snakeCaseData.current_balance = 0;

  const { data, error } = await supabase
    .from('accounts')
    .insert(snakeCaseData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an account in Supabase by its ID.
 * @param {string} accountId - The Supabase account UUID.
 * @param {object} accountData - Account data in camelCase.
 * @returns {Promise<object>} - The updated account from Supabase.
 */
export async function updateAccountInSupabase(accountId, accountData) {
  let snakeCaseData = transformKeysToSnakeCase({ ...accountData });
  delete snakeCaseData.needs_upload;
  delete snakeCaseData.sync_status;
  delete snakeCaseData.last_sync_at;
  delete snakeCaseData.created_on;
  delete snakeCaseData.updated_on;
  delete snakeCaseData.id;
  // do NOT delete is_active

  const { data, error } = await supabase
    .from('accounts')
    .update(snakeCaseData)
    .eq('id', accountId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an account in Supabase by its ID.
 * @param {string} accountId - The Supabase account UUID.
 * @returns {Promise<boolean>} - True if deleted, throws error otherwise.
 */
export async function deleteAccountInSupabase(accountId) {
  // First, delete all transactions associated with the account
  const { error: transactionError } = await supabase
    .from('transactions')
    .delete()
    .eq('account_id', accountId);

  if (transactionError) {
    // If the error is that the transaction table is empty, we can ignore it.
    // RLS might prevent seeing rows, which looks like a 404 (PGRST116)
    if (transactionError.code !== 'PGRST116') {
      console.error('Error deleting transactions for account:', transactionError);
      throw transactionError;
    }
  }

  // Then, delete the account itself
  const { error: accountError } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId);

  if (accountError) {
    console.error('Error deleting account:', accountError);
    throw accountError;
  }

  return true;
}

/**
 * Update a user in Supabase by its ID.
 * @param {string} userId - The Supabase user UUID.
 * @param {object} userData - User data in camelCase.
 * @returns {Promise<object>} - The updated user from Supabase.
 */
export async function updateUserInSupabase(userId, userData) {
  let snakeCaseData = transformKeysToSnakeCase({ ...userData });
  delete snakeCaseData.needs_upload;
  delete snakeCaseData.sync_status;
  delete snakeCaseData.last_sync_at;
  delete snakeCaseData.created_on;
  delete snakeCaseData.updated_on;
  delete snakeCaseData.id;

  const { data, error } = await supabase
    .from('users')
    .update(snakeCaseData)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a contact in Supabase.
 * @param {object} contactData - Contact data in camelCase.
 * @returns {Promise<object>} - The created contact from Supabase.
 */
export async function createContactInSupabase(contactData) {
  let snakeCaseData = transformKeysToSnakeCase({ ...contactData });
  delete snakeCaseData.needs_upload;
  delete snakeCaseData.sync_status;
  delete snakeCaseData.last_sync_at;
  delete snakeCaseData.created_on;
  delete snakeCaseData.updated_on;
  delete snakeCaseData.id;

  const { data, error } = await supabase
    .from('contacts')
    .insert(snakeCaseData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a recurring transaction rule in Supabase.
 * @param {object} recurringData - The recurring rule data from the form.
 * @param {string} transactionId - The ID of the parent/template transaction.
 * @param {string} userId - The Supabase user ID.
 * @returns {Promise<object>} - The created recurring transaction rule.
 */
export async function createRecurringTransactionInSupabase(recurringData, transactionId, userId) {
  const payload = {
    transaction_id: transactionId,
    user_id: userId,
    frequency_type: recurringData.frequency_type,
    interval_value: recurringData.interval_value,
    start_date: new Date(recurringData.start_date).toISOString(),
    end_date: recurringData.end_date ? new Date(recurringData.end_date).toISOString() : null,
    max_occurrences: recurringData.max_occurrences || null,
    current_occurrences: 0,
    is_active: true,
    next_execution_date: new Date(recurringData.start_date).toISOString(),
  };

  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error creating recurring transaction in Supabase:', error);
    throw error;
  }
  return data;
}

/**
 * Fetches a recurring transaction rule by its parent transaction ID.
 * @param {string} transactionId - The parent transaction ID.
 * @returns {Promise<object|null>} - The recurring transaction rule or null.
 */
export async function getRecurringTransactionByTransactionId(transactionId) {
    const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();
    
    // PGRST116 means no rows were found, which is not an error in this case.
    if (error && error.code !== 'PGRST116') { 
        console.error('Error fetching recurring transaction:', error);
        throw error;
    }
    return data;
}

/**
 * Updates an existing recurring transaction rule in Supabase.
 * @param {string} recurringTransactionId - The ID of the recurring_transactions record.
 * @param {object} recurringData - The updated recurring rule data from the form.
 * @returns {Promise<object>} - The updated recurring transaction rule.
 */
export async function updateRecurringTransactionInSupabase(recurringTransactionId, recurringData) {
    const payload = {
        frequency_type: recurringData.frequency_type,
        interval_value: recurringData.interval_value,
        start_date: new Date(recurringData.start_date).toISOString(),
        end_date: recurringData.end_date ? new Date(recurringData.end_date).toISOString() : null,
        max_occurrences: recurringData.max_occurrences || null,
        // When the rule is updated, the next execution should reset to the new start date.
        next_execution_date: new Date(recurringData.start_date).toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('recurring_transactions')
        .update(payload)
        .eq('id', recurringTransactionId)
        .select()
        .single();

    if (error) {
        console.error('Error updating recurring transaction in Supabase:', error);
        throw error;
    }
    return data;
}

/**
 * Deletes a recurring transaction rule from Supabase.
 * @param {string} recurringTransactionId - The ID of the recurring_transactions record.
 * @returns {Promise<boolean>} - True if successful.
 */
export async function deleteRecurringTransactionInSupabase(recurringTransactionId) {
    const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', recurringTransactionId);

    if (error) {
        console.error('Error deleting recurring transaction in Supabase:', error);
        throw error;
    }
    return true;
}

/**
 * Cancels a recurring transaction rule in Supabase.
 * @param {string} transactionId - The ID of the parent/template transaction.
 * @returns {Promise<boolean>} - True if successful.
 */
export async function cancelRecurringTransactionInSupabase(transactionId) {
  // 1. Update the recurring_transactions table to deactivate the rule
  const { data: recurringRule, error: fetchError } = await supabase
    .from('recurring_transactions')
    .select('id')
    .eq('transaction_id', transactionId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching recurring transaction to cancel:', fetchError);
      throw fetchError;
  }

  if (recurringRule) {
    const { error: recurringError } = await supabase
      .from('recurring_transactions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', recurringRule.id);

    if (recurringError) {
      console.error('Error deactivating recurring transaction rule:', recurringError);
      throw recurringError;
    }
  }

  // 2. Update the parent transaction status to 'cancelled'
  const { error: transactionError } = await supabase
    .from('transactions')
    .update({ status: 'cancelled' })
    .eq('id', transactionId);

  if (transactionError) {
    console.error('Error cancelling parent transaction:', transactionError);
    // Potentially roll back the first update? For now, just throw.
    throw transactionError;
  }

  return true;
}

export const syncDownstreamChanges = async (supabaseUserId) => {
  if (!supabaseUserId) {
    console.log('No user to sync for.');
    return;
  }
  // 1. Fetch pending sync_logs from Supabase
  const { data: logs, error: logsError } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('user_id', supabaseUserId)
    .eq('status', 'pending')
    .order('created_on', { ascending: true });

  if (logsError) {
    console.error('Error fetching sync logs:', logsError);
    return;
  }

  if (!logs || logs.length === 0) {
    return;
  }

  for (const log of logs) {
    try {
      if (log.table_name === 'transactions') {
        const { record_id: transactionId, operation } = log;

        if (operation === 'create' || operation === 'update') {
          // 2. Fetch the transaction data from Supabase
          const { data: transactionData, error: transactionError } = await supabase
            .from('transactions')
            .select('*, account:accounts(id, current_balance, updated_on)') // Also fetch related account data
            .eq('id', transactionId)
            .single();
          
          if (transactionError) throw new Error(`Error fetching transaction ${transactionId}: ${transactionError.message}`);
          if (!transactionData) throw new Error(`Transaction ${transactionId} not found in Supabase.`);

          const accountData = transactionData.account;
          if (!accountData) throw new Error(`Account for transaction ${transactionId} not found.`);

          // Remove the nested accounts object before transforming keys
          delete transactionData.account;

          const realmTransaction = transformKeysToCamelCase(transactionData);
          realmTransaction.needsUpload = false;
          realmTransaction.syncStatus = 'synced';
          realmTransaction.lastSyncAt = new Date();

          realm.write(() => {
            const localAccount = realm.objectForPrimaryKey('Account', realmTransaction.accountId);
            if (!localAccount) {
              throw new Error(`Account ${realmTransaction.accountId} not found locally for transaction.`);
            }
            
            realmTransaction.type = getSpecificTransactionType(realmTransaction.type, localAccount.type);

            // 3. Create or update transaction in Realm
            realm.create('Transaction', realmTransaction, Realm.UpdateMode.Modified);

            // 4. Update account balance in Realm
            if (operation === 'create') {
              const amount = realmTransaction.amount || 0;
              if (transactionData.type === 'credit' || transactionData.type === 'borrow') {
                localAccount.currentBalance += amount;
              } else if (transactionData.type === 'debit' || transactionData.type === 'lend') {
                localAccount.currentBalance -= amount;
              }
            } else { // For 'update', it's safer to trust the server's calculation
              localAccount.currentBalance = accountData.current_balance;
            }
            localAccount.updatedOn = new Date(accountData.updated_on);
          });

        } else if (operation === 'delete') {
          const transactionToDelete = realm.objectForPrimaryKey('Transaction', transactionId);
          if (transactionToDelete) {
            const accountId = transactionToDelete.accountId;
            
            realm.write(() => {
              realm.delete(transactionToDelete);
            });

            // Now fetch the updated account balance from Supabase
            const { data: accountData, error: accountError } = await supabase
              .from('accounts')
              .select('current_balance, updated_on')
              .eq('id', accountId)
              .single();

            if (accountError) throw new Error(`Error fetching account ${accountId} after transaction delete: ${accountError.message}`);

            const localAccount = realm.objectForPrimaryKey('Account', accountId);
            if (localAccount && accountData) {
              realm.write(() => {
                localAccount.currentBalance = accountData.current_balance;
                localAccount.updatedOn = new Date(accountData.updated_on);
              });
            }
          }
        }
      }
      // Can add else if for other tables here...

      // 5. Update sync_log status to 'completed'
      const { error: updateLogError } = await supabase
        .from('sync_logs')
        .update({ status: 'synced', processed_at: new Date().toISOString() })
        .eq('id', log.id)
        .eq('user_id', supabaseUserId);

      if (updateLogError) throw new Error(`Failed to update sync_log ${log.id}: ${updateLogError.message}`);

    } catch (error) {
      console.error(`Failed to process sync log ${log.id}:`, error);
      // Update sync_log status to 'failed'
      await supabase
        .from('sync_logs')
        .update({ status: 'failed', error: error.message, processed_at: new Date().toISOString() })
        .eq('id', log.id)
        .eq('user_id', supabaseUserId);
    }
  }
};