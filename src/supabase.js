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
    budgets: 'Budget',
    categories: 'Category',
    user_code_list_elements: 'UserCodeListElement',
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

const SYNC_ORDER = [
  'users',
  'categories',
  'accounts',
  'contacts',
  'budgets',
  'transactions',
  'user_code_list_elements'
];

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
  idMapping.budgets = idMapping.budgets || {};
  idMapping.categories = idMapping.categories || {};

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
    if (schemaName === 'Category') {
      delete data.lastSyncAt;
    }

    const snakeCaseData = transformKeysToSnakeCase(data);

    // This block is now deprecated by the new logic but kept for safety.
    // The new logic resolves dependencies directly from Realm's `supabaseId`.
    if (snakeCaseData.category_id && idMapping.categories[snakeCaseData.category_id]) {
      snakeCaseData.category_id = idMapping.categories[snakeCaseData.category_id];
    }
    if (snakeCaseData.account_id && idMapping.accounts[snakeCaseData.account_id]) {
      snakeCaseData.account_id = idMapping.accounts[snakeCaseData.account_id];
    }
    if (snakeCaseData.contact_id && idMapping.contacts[snakeCaseData.contact_id]) {
      snakeCaseData.contact_id = idMapping.contacts[snakeCaseData.contact_id];
    }
    if (snakeCaseData.on_behalf_of_contact_id && idMapping.contacts[snakeCaseData.on_behalf_of_contact_id]) {
      snakeCaseData.on_behalf_of_contact_id = idMapping.contacts[snakeCaseData.on_behalf_of_contact_id];
    }
    if (snakeCaseData.parent_transaction_id && idMapping.transactions[snakeCaseData.parent_transaction_id]) {
      snakeCaseData.parent_transaction_id = idMapping.transactions[snakeCaseData.parent_transaction_id];
    }

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

          // **REFACTOR START: Replace-in-place logic for User**
          realm.write(() => {
            const oldUser = realm.objectForPrimaryKey(schemaName, recordId);
            if (oldUser) {
                const serverData = transformKeysToCamelCase(result.data);

                // Create a new user object with the correct Supabase ID as the primary key
                const newUser = {
                    ...oldUser.toJSON(), // Preserve existing local data
                    ...serverData,       // Overwrite with server data
                    id: supabaseUserId,  // Set the correct primary key
                    supabaseId: supabaseUserId,
                    syncStatus: 'synced',
                    lastSyncAt: new Date(),
                    needsUpload: false,
                };

                // Create the new user record
                realm.create(schemaName, newUser, Realm.UpdateMode.Modified);
                console.log(`[SYNC-PROCESS] Successfully created new local User with Supabase ID ${supabaseUserId}`);

                // Delete the old user record with the temporary ID
                realm.delete(oldUser);
                console.log(`[SYNC-PROCESS] Deleted old temporary user record ${recordId}`);
            } else {
                console.warn(`[SYNC-PROCESS] User record ${recordId} not found in Realm to replace.`);
            }
          });
          // **REFACTOR END**

          // Store the user ID mapping
          idMapping.users[recordId] = supabaseUserId;
          console.log(`[SYNC-PROCESS] User ID mapping: ${recordId} -> ${supabaseUserId}`);

          realm.write(() => {
            const otherLogs = realm.objects('SyncLog').filtered('userId == $0 AND (status == "pending" OR status == "failed")', recordId);
            console.log(`[SYNC-PROCESS] Found ${otherLogs.length} other pending logs for old user ID ${recordId}. Updating them to new user ID ${supabaseUserId}.`);
            otherLogs.forEach(log => {
              log.userId = supabaseUserId;
            });
          });

          return true;
        } else {
          console.log(`[SYNC-PROCESS] Sending CREATE request to Supabase table: ${tableName}`);

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

            // Set the new ID and user_id for transactions
            snakeCaseData.id = newTransactionId;
            snakeCaseData.user_id = supabaseUserId;
          } else {
            // Let Supabase generate the new ID, but ensure user_id is set for RLS
            delete snakeCaseData.id;
            snakeCaseData.user_id = supabaseUserId;
          }

          // **REFACTOR START: Robust Foreign Key Mapping**
          const resolveForeignKey = (localId, modelName, mapping) => {
            if (!localId) return null;
            // 1. Check in-memory map first (for items created in the same sync batch)
            if (mapping[localId]) return mapping[localId];
            // 2. Check the local Realm record for a supabaseId
            const relatedRecord = realm.objectForPrimaryKey(modelName, localId);
            if (relatedRecord && relatedRecord.supabaseId) return relatedRecord.supabaseId;
            // 3. If it's a valid UUID, assume it's already a remote ID (e.g., from a previous sync)
            if (isUUID(localId)) return localId;
            // 4. If all else fails, we cannot resolve the dependency
            throw new Error(`Could not resolve foreign key for ${modelName} with local ID ${localId}`);
          };

          if (tableName === 'budgets') {
            snakeCaseData.category_id = resolveForeignKey(data.categoryId, 'Category', idMapping.categories);
          }
          if (tableName === 'transactions') {
            snakeCaseData.account_id = resolveForeignKey(data.accountId, 'Account', idMapping.accounts);
            snakeCaseData.contact_id = resolveForeignKey(data.contactId, 'Contact', idMapping.contacts);
            snakeCaseData.category_id = resolveForeignKey(data.categoryId, 'Category', idMapping.categories);
            snakeCaseData.parent_transaction_id = resolveForeignKey(data.parentTransactionId, 'Transaction', idMapping.transactions);
          }
          if (tableName === 'categories') {
              snakeCaseData.parent_category_id = resolveForeignKey(data.parentCategoryId, 'Category', idMapping.categories);
          }
          // **REFACTOR END**

          if (tableName === 'accounts') {
            snakeCaseData.current_balance = 0;
          }

          await delay(500); // 500ms delay

          // FIXED: Use authenticated Supabase client for RLS compliance
          console.log(`[SYNC-PROCESS] Creating ${tableName} with authenticated user context`);
          result = await supabase.from(tableName).insert(snakeCaseData).select().single();

          if (result.error) {
            console.error('[SYNC-PROCESS] Supabase CREATE failed:', result.error.message);
            console.error('Request Body was:', JSON.stringify(snakeCaseData, null, 2));
            console.error('Error details:', result.error);
            throw result.error;
          }

          if (!result.data) throw new Error('Create operation did not return data from Supabase.');

          console.log('[SYNC-PROCESS] Supabase create result:', result.data);
          const newSupabaseId = result.data.id;

          // **REFACTOR START: Replace-in-place logic for all models**
          realm.write(() => {
            const oldRecord = realm.objectForPrimaryKey(schemaName, recordId);
            if (oldRecord) {
              const newRecordData = {
                ...oldRecord.toJSON(),
                ...transformKeysToCamelCase(result.data),
                id: newSupabaseId, // Set the primary key to the Supabase ID
                supabaseId: newSupabaseId,
                syncStatus: 'synced',
                lastSyncAt: new Date(),
                needsUpload: false,
              };

              // For accounts, preserve the locally calculated balance if it exists
              if (tableName === 'accounts' && operation === 'create') {
                newRecordData.currentBalance = oldRecord.currentBalance;
                newRecordData.receiving_money = oldRecord.receiving_money;
                newRecordData.sending_money = oldRecord.sending_money;
              }

              // Create the new record with the Supabase ID
              realm.create(schemaName, newRecordData, Realm.UpdateMode.Modified);
              console.log(`[SYNC-PROCESS] Successfully created new local record with Supabase ID ${newSupabaseId}`);

              // Now, safely delete the old record with the temporary ID
              realm.delete(oldRecord);
              console.log(`[SYNC-PROCESS] Deleted old temporary record ${recordId}`);
            } else {
              // This case should ideally not happen if the logic is correct.
              // It means the record was deleted between being read and now.
              // We'll create it fresh from the server data.
              console.warn(`[SYNC-PROCESS] Record ${recordId} not found to replace, creating new.`);
              const newRealmData = transformKeysToCamelCase(result.data);
              realm.create(schemaName, {
                ...newRealmData,
                id: newSupabaseId, // Use the Supabase ID as the primary key
                supabaseId: newSupabaseId,
                syncStatus: 'synced',
                lastSyncAt: new Date(),
                needsUpload: false,
              }, Realm.UpdateMode.Modified);
            }
          });
          // **REFACTOR END**

          // Store the mapping from the old local ID to the new Supabase ID
          if (!idMapping[tableName]) {
            idMapping[tableName] = {};
          }
          idMapping[tableName][recordId] = newSupabaseId;
          console.log(`[SYNC-PROCESS] ${tableName} ID mapping: ${recordId} -> ${newSupabaseId}`);

          return true;
        }

      case 'update':
        // FIXED: Enhanced user update handling
        if (tableName === 'users') {
          console.log(`[SYNC-PROCESS] Handling user UPDATE for ID: ${supabaseUserId}`);

          // For user updates, we need to use the supabaseId from the record or idMapping
          let userIdToUpdate = supabaseUserId;

          // Check if we have a mapped ID
          if (idMapping.users[recordId]) {
            userIdToUpdate = idMapping.users[recordId];
            console.log(`[SYNC-PROCESS] Using mapped user ID: ${recordId} -> ${userIdToUpdate}`);
          } else {
            // Check if the record has a supabaseId
            const userRecord = realm.objectForPrimaryKey('User', recordId);
            if (userRecord && userRecord.supabaseId) {
              userIdToUpdate = userRecord.supabaseId;
              console.log(`[SYNC-PROCESS] Using supabaseId from record: ${userIdToUpdate}`);
            } else {
              console.log(`[SYNC-PROCESS] Using default supabaseUserId: ${userIdToUpdate}`);
            }
          }

          delete snakeCaseData.id;

          const updateData = {
            ...snakeCaseData,
            user_type: 'paid',
            email_confirmed: true
          };

          await delay(500);
          result = await supabase.from(tableName)
            .update(updateData)
            .eq('id', userIdToUpdate)
            .select()
            .single();

          if (result.error) throw result.error;

          realm.write(() => {
            const userRecord = realm.objectForPrimaryKey(schemaName, recordId);
            if (userRecord) {
              // Just update the sync status - don't replace the entire record
              userRecord.syncStatus = 'synced';
              userRecord.lastSyncAt = new Date();
              userRecord.needsUpload = false;
              // Ensure supabaseId is set
              if (!userRecord.supabaseId) {
                userRecord.supabaseId = userIdToUpdate;
              }
              console.log(`[SYNC-PROCESS] Successfully updated user sync status for ${recordId} with Supabase ID ${userIdToUpdate}`);
            }
          });

          // Update the mapping
          idMapping.users[recordId] = userIdToUpdate;
          return true;
        }

        // For non-user updates
        const idToUpdate = idMapping[tableName]?.[recordId] || record.supabaseId || recordId;
        console.log(`[SYNC-PROCESS] Sending UPDATE request to Supabase table: ${tableName} for ID: ${idToUpdate} (local ID was: ${recordId})`);

        // Update foreign keys using ID mapping
        if (tableName === 'accounts' || tableName === 'contacts' || tableName === 'transactions' || tableName === 'budgets' || tableName === 'categories') {
          snakeCaseData.user_id = supabaseUserId;
        }

        if (tableName === 'budgets') {
          if (snakeCaseData.category_id) {
            const mappedCategoryId = idMapping.categories[snakeCaseData.category_id];
            if (mappedCategoryId) {
              snakeCaseData.category_id = mappedCategoryId;
            } else if (!isUUID(snakeCaseData.category_id)) {
              throw new Error(`Category ID ${snakeCaseData.category_id} not found in ID mapping for update`);
            }
          }
        }

        if (tableName === 'categories') {
          if (snakeCaseData.parent_category_id) {
            const mappedParentId = idMapping.categories[snakeCaseData.parent_category_id];
            if (mappedParentId) {
              snakeCaseData.parent_category_id = mappedParentId;
            } else if (!isUUID(snakeCaseData.parent_category_id)) {
              throw new Error(`Parent Category ID ${snakeCaseData.parent_category_id} not found in ID mapping for update`);
            }
          }
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
        
        // **REFACTOR START: Simplified update logic**
        realm.write(() => {
          const recordToUpdate = realm.objectForPrimaryKey(schemaName, recordId);
          if (recordToUpdate) {
            recordToUpdate.syncStatus = 'synced';
            recordToUpdate.lastSyncAt = new Date();
            recordToUpdate.needsUpload = false;
            console.log(`[SYNC-PROCESS] Updated local record sync status for ${recordId}`);
          }
        });
        // **REFACTOR END**
        return true;

      case 'delete':
        const idToDelete = idMapping[tableName]?.[recordId] || record.supabaseId || recordId;
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

  // Sort logs by table dependency order: users -> categories -> accounts -> contacts -> transactions -> budgets
  const pendingLogs = Array.from(pendingLogsPlain).map(log => log.toJSON());
  const tablePriority = { users: 0, categories: 1, accounts: 2, contacts: 3, transactions: 4, budgets: 5 };
  pendingLogs.sort((a, b) => {
    const priorityA = tablePriority[a.tableName] || 999;
    const priorityB = tablePriority[b.tableName] || 999;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Special sorting for categories to handle parent-child dependencies
    if (a.tableName === 'categories' && a.operation === 'create') {
      const recordA = realm.objectForPrimaryKey('Category', a.recordId);
      const recordB = realm.objectForPrimaryKey('Category', b.recordId);

      // Handle case where records might have been deleted after log creation
      if (!recordA || !recordB) {
        return 0;
      }

      const isAParent = !recordA.parentCategoryId;
      const isBParent = !recordB.parentCategoryId;

      if (isAParent && !isBParent) {
        return -1; // a (parent) comes before b (child)
      }
      if (!isAParent && isBParent) {
        return 1; // b (parent) comes before a (child)
      }
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
    transactions: {},
    budgets: {},
    categories: {},
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
  try {
    const recurringTx = await getRecurringTransactionByTransactionId(transactionId);

    if (!recurringTx) {
      throw new Error(`Recurring transaction not found for transaction ID: ${transactionId}`);
    }

    const { error: updateError } = await supabase
      .from('recurring_transactions')
      .update({ status: 'cancelled' })
      .eq('id', recurringTx.id);

    if (updateError) {
      throw new Error(`Failed to cancel recurring transaction: ${updateError.message}`);
    }

    console.log(`Recurring transaction ${recurringTx.id} cancelled successfully.`);
    return true;
  } catch (error) {
    console.error('Error in cancelRecurringTransactionInSupabase:', error);
    throw error;
  }
}

/**
 * Create a budget in Supabase.
 * @param {object} budgetData - Budget data in camelCase.
 * @returns {Promise<object>} - The created budget from Supabase.
 */
export async function createBudgetInSupabase(budgetData) {
  try {
    const payload = transformKeysToSnakeCase(budgetData);

    const { data, error } = await supabase
      .from('budgets')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const result = transformKeysToCamelCase(data);

    // Ensure date fields are Date objects for Realm
    if (result.startDate) result.startDate = new Date(result.startDate);
    if (result.endDate) result.endDate = new Date(result.endDate);

    return result;

  } catch (error) {
    console.error('Error in createBudgetInSupabase:', error);
    throw error;
  }
}

/**
 * Update a budget in Supabase by its ID.
 * @param {string} budgetId - The Supabase budget UUID.
 * @param {object} budgetData - Budget data in camelCase.
 * @returns {Promise<object>} - The updated budget from Supabase.
 */
export async function updateBudgetInSupabase(budgetId, budgetData) {
  try {
    const payload = transformKeysToSnakeCase(budgetData);

    const { data, error } = await supabase
      .from('budgets')
      .update(payload)
      .eq('id', budgetId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const result = transformKeysToCamelCase(data);

    // Ensure date fields are Date objects for Realm
    if (result.startDate) result.startDate = new Date(result.startDate);
    if (result.endDate) result.endDate = new Date(result.endDate);

    return result;
  } catch (error) {
    console.error('Error in updateBudgetInSupabase:', error);
    throw error;
  }
}

/**
 * Delete a budget in Supabase by its ID.
 * @param {string} budgetId - The Supabase budget UUID.
 * @returns {Promise<boolean>} - True if deleted, throws error otherwise.
 */
export async function deleteBudgetInSupabase(budgetId) {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', budgetId);

    if (error) {
      console.error('Error deleting budget in Supabase:', error);
      throw error;
    }
    return { data, error };
  } catch (error) {
    console.error('Error in deleteBudgetInSupabase:', error);
    throw error;
  }
}

/**
 * Fetches all budgets for the current user from Supabase.
 * @returns {Promise<Array<object>>}
 */
export async function getBudgetsFromSupabase() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not found");

  const { data, error } = await supabase
    .from('budgets')
    .select('*, category:categories(name, icon, color)')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error) throw error;
  return data;
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

export async function createCategoryInSupabase(categoryData) {
  const snakeCaseData = transformKeysToSnakeCase(categoryData);
  const { data, error } = await supabase
    .from('categories')
    .insert([snakeCaseData])
    .select()
    .single();

  if (error) {
    console.error('Error creating category in Supabase:', error);
    throw error;
  }

  return transformKeysToCamelCase(data);
}

export async function updateCategoryInSupabase(categoryId, categoryData) {
  const snakeCaseData = transformKeysToSnakeCase(categoryData);
  const { data, error } = await supabase
    .from('categories')
    .update(snakeCaseData)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) {
    console.error('Error updating category in Supabase:', error);
    throw error;
  }

  return transformKeysToCamelCase(data);
}

export async function deleteCategoryInSupabase(categoryId) {
  const { data, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (error) {
    console.error('Error deleting category in Supabase:', error);
    throw error;
  }
  return { data, error };
}
