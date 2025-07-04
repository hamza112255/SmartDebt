import Realm from "realm";

export const UserSchema = {
  name: "User",
  primaryKey: "id",
  properties: {
    id: "string",
    supabaseId: "string?",
    email: "string",
    firstName: "string?",
    lastName: "string?",
    passwordHash: "string?",
    language: "string",
    timezone: "string?",
    profilePictureUrl: "string?",
    pinCode: "string?",
    pinEnabled: "bool",
    biometricEnabled: "bool",
    isActive: "bool",
    emailConfirmed: "bool",
    userType: "string",
    createdOn: "date",
    updatedOn: "date",
    lastLoginAt: "date?",
    lastSyncAt: "date?",
    syncStatus: "string",
    needsUpload: "bool"
  },
};

export const AccountSchema = {
  name: "Account",
  primaryKey: "id",
  properties: {
    id: "string",
    supabaseId: "string?",
    name: "string",
    currency: "string",
    type: "string",
    language: "string",
    userId: "string",
    initial_amount: { type: "double", default: 0 },
    isPrimary: { type: "bool", default: false },
    currentBalance: { type: "double", default: 0 },
    receiving_money: { type: "double", default: 0 },
    sending_money: { type: "double", default: 0 },
    isActive: "bool",
    showBalance: { type: "bool", default: true },
    createdOn: "date",
    updatedOn: "date",
    syncStatus: "string",
    lastSyncAt: "date?",
    needsUpload: "bool",
  },
};

export const ContactSchema = {
  name: "Contact",
  primaryKey: "id",
  properties: {
    id: "string",
    supabaseId: "string?",
    name: "string",
    phone: "string?",
    email: "string?",
    photoUrl: "string?",
    userId: "string",
    contactUserId: "string?",
    totalOwed: "double",
    totalOwing: "double",
    isActive: "bool",
    createdOn: "date",
    updatedOn: "date",
    syncStatus: "string",
    lastSyncAt: "date?",
    needsUpload: "bool",
  },
};

export const CategorySchema = {
  name: "Category",
  primaryKey: "id",
  properties: {
    id: "string",
    supabaseId: "string?",
    name: "string",
    type: "string",
    description: "string?",
    color: "string?",
    icon: "string?",
    userId: "string?", // null for system defaults
    parentCategoryId: "string?", // for hierarchical categories
    isActive: { type: "bool", default: true },
    createdOn: "date",
    updatedOn: "date",
    syncStatus: "string",
    lastSyncAt: "date?",
    needsUpload: "bool",
  },
};

export const TransactionSchema = {
  name: "Transaction",
  primaryKey: "id",
  properties: {
    id: "string",
    supabaseId: "string?",
    type: "string",
    purpose: "string?",
    amount: "double",
    accountId: "string",
    userId: "string",
    contactId: "string?",
    categoryId: "string?", // Added for categorization
    transactionDate: "date",
    dueDate: "date?",
    remarks: "string?",
    photoUrl: "string?",
    remindToContact: { type: "bool", default: false },
    remindMe: { type: "bool", default: false },
    remindToContactType: { type: "string", default: null, optional: true },
    remindMeType: { type: "string", default: null, optional: true },
    remindContactAt: { type: "date", default: null, optional: true },
    remindMeAt: { type: "date", default: null, optional: true },
    status: "string",
    isRecurring: "bool",
    is_proxy_payment: { type: "bool", default: false },
    on_behalf_of_contact_id: "string?",
    recurringPattern: "string?",
    parentTransactionId: "string?",
    isSettled: "bool",
    settledAt: "date?",
    settlementNote: "string?",
    createdOn: "date",
    updatedOn: "date",
    syncStatus: "string",
    lastSyncAt: "date?",
    needsUpload: "bool",
  },
};

export const CodeListSchema = {
  name: "CodeList",
  primaryKey: "name",
  properties: {
    name: "string",
    description: "string?",
    isActive: "bool",
    createdOn: "date",
    updatedOn: "date",
  },
};

export const CodeListElementSchema = {
  name: "CodeListElement",
  primaryKey: "id",
  properties: {
    id: "string",
    codeListName: "string",
    element: "string",
    description: "string?",
    active: "bool",
    sortOrder: "int",
    createdOn: "date",
    updatedOn: "date",
  },
};

export const UserCodeListElementSchema = {
  name: "UserCodeListElement",
  primaryKey: "id",
  properties: {
    id: "string",
    codeListName: "string",
    element: "string",
    description: "string?",
    active: "bool",
    userId: "string",
    sortOrder: "int",
    createdOn: "date",
    updatedOn: "date",
    syncStatus: "string",
    lastSyncAt: "date?",
    needsUpload: "bool",
  },
};

export const ReportSchema = {
  name: "Report",
  primaryKey: "id",
  properties: {
    id: "string",
    userId: "string",
    type: "string", // 'transaction', 'contact', 'account'
    subType: "string", // 'summary', 'balance', 'cashflow', etc.
    title: "string",
    dateRange: "string", // 'daily', 'weekly', 'monthly', 'custom'
    startDate: "date",
    endDate: "date",
    filters: "string?", // JSON string of filters
    generatedOn: "date",
    data: "string", // JSON string of report data
    isArchived: { type: "bool", default: false },
    createdOn: "date",
    updatedOn: "date",
  },
};

export const SyncLogSchema = {
  name: 'SyncLog',
  primaryKey: 'id',
  properties: {
    id: 'string',
    userId: 'string',
    tableName: 'string',
    recordId: 'string',
    operation: 'string', // 'create', 'update', 'delete'
    status: 'string', // 'pending', 'completed', 'failed'
    error: 'string?',
    createdOn: 'date',
    processedAt: 'date?',
  },
};

export const ProxyPaymentSchema = {
  name: "ProxyPayment",
  primaryKey: "id",
  properties: {
    id: "string",
    payerUserId: "string", // UUID of payer user
    onBehalfOfUserId: "string", // UUID of user on whose behalf payment is made
    recipientContactId: "string", // UUID of contact
    amount: "double",
    originalTransactionId: "string",
    debtAdjustmentTransactionId: "string?",
    notificationSent: { type: "bool", default: false },
    createdOn: "date",
    updatedOn: "date",
  },
};

export const BudgetSchema = {
  name: 'Budget',
  primaryKey: 'id',
  properties: {
    id: 'string',
    supabaseId: 'string?',
    name: 'string',
    amount: 'double',
    period: 'string', // 'daily', 'weekly', 'monthly', 'yearly'
    startDate: 'date',
    endDate: 'date',
    categoryId: 'string?',
    userId: 'string',
    isActive: { type: 'bool', default: true },
    createdOn: 'date',
    updatedOn: 'date',
    syncStatus: 'string', // 'synced', 'pending', 'failed'
    lastSyncAt: 'date?',
    needsUpload: 'bool',
  },
};

let realm;

// All schemas
const schemas = [
  UserSchema,
  AccountSchema,
  ContactSchema,
  TransactionSchema,
  CategorySchema,
  CodeListSchema,
  CodeListElementSchema,
  UserCodeListElementSchema,
  SyncLogSchema,
  ReportSchema,
  ProxyPaymentSchema,
  BudgetSchema,
];

try {
  realm = new Realm({
    path: 'Settly.realm',
    schema: schemas,
    schemaVersion: 3, // Increment schema version
    migration: (oldRealm, newRealm) => {
      if (oldRealm.schemaVersion < 2) {
        // Migration for schema version 1 to 2
      }
      if (oldRealm.schemaVersion < 3) {
        const oldCategories = oldRealm.objects("Category");
        for (const oldCategory of oldCategories) {
          const newCategory = newRealm.objectForPrimaryKey("Category", oldCategory.id);
          if (newCategory) {
            newCategory.type = "expense"; // Default value for existing categories
            newCategory.supabaseId = null;
          }
        }

        const otherSchemas = ["Account", "Contact", "Transaction", "Budget"];
        otherSchemas.forEach(schemaName => {
          const oldObjects = oldRealm.objects(schemaName);
          for (const oldObject of oldObjects) {
            const newObject = newRealm.objectForPrimaryKey(schemaName, oldObject.id);
            if (newObject) {
              newObject.supabaseId = null;
            }
          }
        });
      }
    },
  });
} catch (e) {
  console.error('Failed to open Realm:', e);
  // Fallback or recovery mechanism
  try {
    console.log('Attempting to open Realm with destructive migration...');
    Realm.deleteFile({ schema: schemas }); // Deletes the realm file
    realm = new Realm({
      path: 'Settly.realm',
      schema: schemas,
      schemaVersion: 3,
    });
    console.log('Realm opened successfully after destructive migration.');
  } catch (err) {
    console.error('Failed to open Realm even after destructive migration:', err);
  }
}

export { realm };

export const initializeRealm = async () => {
  try {
    if (!realm || realm.isClosed) {
      realm = await Realm.open({
        schema: schemas,
        schemaVersion: 3,
        migration: (oldRealm, newRealm) => {
          if (oldRealm.schemaVersion < 2) {
            // Migration for schema version 1 to 2
          }
          if (oldRealm.schemaVersion < 3) {
            const oldCategories = oldRealm.objects("Category");
            for (const oldCategory of oldCategories) {
              const newCategory = newRealm.objectForPrimaryKey("Category", oldCategory.id);
              if (newCategory) {
                newCategory.type = "expense"; // Default value for existing categories
                newCategory.supabaseId = null;
              }
            }
    
            const otherSchemas = ["Account", "Contact", "Transaction", "Budget"];
            otherSchemas.forEach(schemaName => {
              const oldObjects = oldRealm.objects(schemaName);
              for (const oldObject of oldObjects) {
                const newObject = newRealm.objectForPrimaryKey(schemaName, oldObject.id);
                if (newObject) {
                  newObject.supabaseId = null;
                }
              }
            });
          }
        },
      });
      console.log('Realm initialized successfully');
    }
    return realm;
  } catch (error) {
    console.error('Failed to initialize Realm:', error);
    throw error;
  }
};

export const createObject = (modelName, data) => {
  realm.write(() => {
    realm.create(modelName, data, Realm.UpdateMode.Modified);
  });
};

export const getAllObjects = (modelName) => realm.objects(modelName);

export const updateObject = (modelName, primaryKey, data) => {
  realm.write(() => {
    realm.create(modelName, { ...data, id: primaryKey }, Realm.UpdateMode.Modified);
  });
};

export const deleteObject = (modelName, primaryKey) => {
  realm.write(() => {
    const obj = realm.objectForPrimaryKey(modelName, primaryKey);
    if (obj) realm.delete(obj);
  });
};

export const deleteAll = () => {
  realm.write(() => {
    realm.deleteAll();
  });
};

export const createSyncLog = (logData) => {
  return realm.write(() => {
    return realm.create('SyncLog', {
      id: Date.now().toString(),
      userId: logData.userId,
      tableName: logData.tableName,
      recordId: logData.recordId,
      operation: logData.operation,
      status: logData.status || 'pending',
      error: logData.error || null,
      createdOn: new Date(),
      processedAt: null,
    });
  });
};

export const getPendingSyncLogs = (userId) => {
  return realm.objects('SyncLog').filtered('userId == $0 && status == "pending"', userId);
};

export const updateSyncLogStatus = (logId, status, error = null) => {
  return realm.write(() => {
    const log = realm.objectForPrimaryKey('SyncLog', logId);
    if (log) {
      log.status = status;
      log.processedAt = new Date();
      if (error) log.error = error;
    }
    return log;
  });
};

export const deleteSyncLog = (logId) => {
  return realm.write(() => {
    const log = realm.objectForPrimaryKey('SyncLog', logId);
    if (log) {
      realm.delete(log);
      return true;
    }
    return false;
  });
};

// ---------------- ProxyPayment CRUD Helpers ---------------- //
export const createProxyPayment = (data) => {
  realm.write(() => {
    realm.create("ProxyPayment", {
      ...data,
      id: data.id || Date.now().toString(),
      createdOn: data.createdOn || new Date(),
      updatedOn: data.updatedOn || new Date(),
    }, Realm.UpdateMode.Modified);
  });
};

export const getAllProxyPayments = () => realm.objects("ProxyPayment");

export const updateProxyPayment = (id, data) => {
  realm.write(() => {
    realm.create("ProxyPayment", {
      ...data,
      id,
      updatedOn: new Date(),
    }, Realm.UpdateMode.Modified);
  });
};

export const deleteProxyPayment = (id) => {
  realm.write(() => {
    const obj = realm.objectForPrimaryKey("ProxyPayment", id);
    if (obj) realm.delete(obj);
  });
};
