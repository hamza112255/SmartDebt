import Realm from 'realm';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { realm } from './realm';

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
      // Special handling for account type - map to 'type' not 'account_type'
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

// Function to fetch and store code lists from Supabase
export const fetchAndStoreCodeLists = async () => {
  try {
    // Clear existing code lists first
    realm.write(() => {
      realm.delete(realm.objects('CodeList'));
      realm.delete(realm.objects('CodeListElement'));
    });
    
    // Fetch code lists
    const { data: codeLists, error: listsError } = await supabase
      .from('code_lists')
      .select('*')
      .eq('is_active', true);

    if (listsError) throw listsError;

    // Process each code list sequentially
    for (const list of codeLists) {
      const { data: elements, error: elementsError } = await supabase
        .from('code_list_elements')
        .select('*')
        .eq('code_list_name', list.name)
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (elementsError) throw elementsError;

      realm.write(() => {
        // Store code list
        realm.create('CodeList', {
          name: list.name,
          description: list.description,
          isActive: list.is_active,
          createdOn: new Date(list.created_on),
          updatedOn: new Date(list.updated_on)
        });

        // Store elements
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

export const processSyncLog = async (syncLog, supabaseUserId, schemaName) => {
  console.log(`[SYNC-PROCESS] ==> Processing Log ID: ${syncLog.id}`);
  console.log(`[SYNC-PROCESS] Operation: ${syncLog.operation} for table: ${syncLog.tableName} (Schema: ${schemaName})`);
  console.log(`[SYNC-PROCESS] Record ID: ${syncLog.recordId}`);
  console.log(`[SYNC-PROCESS] Supabase User ID: ${supabaseUserId}`);
  console.log('[SYNC-PROCESS] Starting sync for log:', syncLog.id, 'with supabaseUserId:', supabaseUserId);
  try {
    const { tableName, recordId, operation } = syncLog;
    console.log(`[SYNC-PROCESS] Fetching local record from Realm: ${schemaName} with ID: ${recordId}`);
    console.log(`[SYNC-PROCESS] Processing ${operation} for ${schemaName} (${tableName}) with local ID ${recordId}`);

    const record = realm.objectForPrimaryKey(schemaName, recordId);

  if (!record && operation !== 'delete') {
    console.error(`[SYNC-PROCESS] CRITICAL: Record with ID ${recordId} not found in Realm schema ${schemaName} for a non-delete operation.`);
    // throw new Error(`Record not found: ${recordId}`);
    return; // Exit if no record to process
  }
    if (!record && operation !== 'delete') {
      throw new Error(`Record not found in Realm: ${schemaName}/${recordId}`);
    }

    const data = record ? { ...record.toJSON() } : {};
    delete data._id; // Ensure internal Realm fields are not sent

    // Remove Realm-specific fields that are not in Supabase
    delete data.needsUpload;
    delete data.syncStatus;
    delete data.supabaseId;
    delete data.passwordHash; // Only relevant for User schema, but safe to have here
    
    const snakeCaseData = transformKeysToSnakeCase(data);
  console.log('[SYNC-PROCESS] Original data (camelCase):', JSON.stringify(data, null, 2));
  console.log('[SYNC-PROCESS] Transformed data for Supabase (snake_case):', JSON.stringify(snakeCaseData, null, 2));

    let result;
    
    switch (operation) {
      case 'create':
        // Special handling for users - update existing with proper UUID
        if (tableName === 'users') {
          console.log(`[SYNC-PROCESS] Handling user as UPDATE for ID: ${supabaseUserId}`);
          
          // Remove the numeric ID and use Supabase UUID
          delete snakeCaseData.id;
          
          result = await supabase.from(tableName)
            .update(snakeCaseData)
            .eq('id', supabaseUserId)
            .select()
            .single();
            
          if (result.error) throw result.error;
          
          // Delete old Realm record and create fresh one
          realm.write(() => {
            const oldRecord = realm.objectForPrimaryKey(schemaName, recordId);
            if (oldRecord) realm.delete(oldRecord);
            
            const freshData = {
              ...transformKeysToCamelCase(result.data),
              syncStatus: 'synced',
              lastSyncAt: new Date(),
              needsUpload: false
            };
            realm.create(schemaName, freshData);
          });
          return true;
        } else {
          console.log(`[SYNC-PROCESS] Sending CREATE request to Supabase table: ${tableName}`);
          result = await supabase.from(tableName).insert(snakeCaseData).select().single();
        }
        console.log('[SYNC-PROCESS] Supabase CREATE response:', JSON.stringify(result, null, 2));

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
          if (oldRecord) {
            realm.delete(oldRecord);
          }
          const finalData = {
            ...newRealmData,
            syncStatus: 'synced',
            lastSyncAt: new Date(),
            needsUpload: false,
          };
          realm.create(schemaName, finalData, Realm.UpdateMode.Modified);
          console.log(`[SYNC-PROCESS] Successfully replaced local record ${recordId} with new Supabase record ${finalData.id}`);
        });
        return true;
        
      case 'update':
        console.log(`[SYNC-PROCESS] Sending UPDATE request to Supabase table: ${tableName} for ID: ${recordId}`);
        result = await supabase.from(tableName).update(snakeCaseData).eq('id', recordId);
        console.log('[SYNC-PROCESS] Supabase UPDATE response:', JSON.stringify(result, null, 2));
        if (result.error) {
          console.error('[SYNC-PROCESS] Supabase UPDATE failed:', result.error.message);
          console.error('Request Body was:', JSON.stringify(snakeCaseData, null, 2));
          throw result.error;
        }
        console.log('[SYNC-PROCESS] Update successful');
        return true;
        
      case 'delete':
        console.log('[SYNC-PROCESS] Deleting record from Supabase with ID:', recordId);
        result = await supabase.from(tableName).delete().eq('id', recordId);
        if (result.error) {
          console.error('[SYNC-PROCESS] Supabase DELETE failed:', result.error.message);
          throw result.error;
        }
        console.log('[SYNC-PROCESS] Supabase DELETE response:', JSON.stringify(result, null, 2));
        console.log('[SYNC-PROCESS] Delete successful');
        return true;
        
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.error(`[SYNC-PROCESS] Error processing ${syncLog.tableName}/${syncLog.recordId}:`, error);
    throw error;
  }
};

export const syncPendingChanges = async (realmUserId, onProgress = () => {}) => {
  console.log(`[SYNC] ===== Starting Full Sync for Realm User ID: ${realmUserId} =====`);
  console.log('[SYNC] Starting sync for Realm user:', realmUserId);
  
  const realmUser = realm.objectForPrimaryKey('User', realmUserId);
  if (!realmUser || !realmUser.supabaseId) {
    console.log('[SYNC] No matching Realm user found or user is missing supabaseId.');
    return { total: 0, success: 0, failed: 0 };
  }
  
  console.log('[SYNC] Found matching Realm user with supabaseId:', realmUser.supabaseId);

  const pendingLogsPlain = realm.objects('SyncLog').filtered(
    'status == "pending" && userId == $0',
    realmUser.id
  ).sorted('createdOn');

  const pendingLogs = Array.from(pendingLogsPlain).map(log => log.toJSON());

  const total = pendingLogs.length;
  let successCount = 0;
  let failedCount = 0;

  console.log(`[SYNC] Found ${total} pending logs.`);
  if (total > 0) {
    console.log('[SYNC] Pending Log IDs:', pendingLogs.map(p => p.id));
  }

  if (total === 0) {
    onProgress({ current: 0, total: 0, tableName: 'N/A' });
    return { total: 0, success: 0, failed: 0 };
  }

  for (let i = 0; i < total; i++) {
    const log = pendingLogs[i]; // log is now a plain object
    const current = i + 1;
    const schemaName = getModelNameForTableName(log.tableName);

    console.log(`[SYNC] ---------> Processing Log ${current}/${total}: ID ${log.id} | ${log.operation.toUpperCase()} on ${log.tableName} <---------`);
    onProgress({ current, total, tableName: log.tableName });

    try {
      const success = await processSyncLog(log, realmUser.supabaseId, schemaName);
      if (success) {
        console.log(`[SYNC] Successfully processed Log ID: ${log.id}`);
        const logToUpdate = realm.objectForPrimaryKey('SyncLog', log.id);
        if (logToUpdate) {
          realm.write(() => {
            logToUpdate.status = 'completed';
            logToUpdate.processedAt = new Date();

            if (log.operation === 'update') {
              const updatedRecord = realm.objectForPrimaryKey(schemaName, log.recordId);
              if (updatedRecord) {
                updatedRecord.syncStatus = 'synced';
                updatedRecord.lastSyncAt = new Date();
                updatedRecord.needsUpload = false;
              }
            }
          });
        }
        successCount++;
      } else {
        throw new Error('Sync process returned a non-true value without throwing an error.');
      }
    } catch (error) {
      console.error(`[SYNC] FAILED to process Log ID: ${log.id}. Error:`, error);
      failedCount++;
      const logToUpdate = realm.objectForPrimaryKey('SyncLog', log.id);
      if (logToUpdate) {
        realm.write(() => {
          logToUpdate.status = 'failed';
          logToUpdate.error = String(error.message || error);
        });
      }
    }
  }

  console.log(`[SYNC] Finished. Total: ${total}, Success: ${successCount}, Failed: ${failedCount}`);
  return { total, success: successCount, failed: failedCount };
};
