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
    name: "string",
    currency: "string",
    type: "string",
    language: "string",
    userId: "string",
    isPrimary: "bool",
    currentBalance: "double",
    // Dynamic columns based on account type
    cash_in: { type: "double", default: 0 },
    cash_out: { type: "double", default: 0 },
    debit: { type: "double", default: 0 },
    credit: { type: "double", default: 0 },
    receive: { type: "double", default: 0 },
    send_out: { type: "double", default: 0 },
    borrow: { type: "double", default: 0 },
    lend: { type: "double", default: 0 },
    isActive: "bool",
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
    name: "string",
    phone: "string?",
    email: "string?",
    photoUrl: "string?",
    userId: "string",
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

export const TransactionSchema = {
  name: "Transaction",
  primaryKey: "id",
  properties: {
    id: "string",
    type: "string",
    purpose: "string?",
    amount: "double",
    accountId: "string",
    userId: "string",
    contactId: "string?",
    transactionDate: "date",
    dueDate: "date?",
    remarks: "string?",
    photoUrl: "string?",
    remindToContact: "bool",
    remindMe: "bool",
    remindToContactType: "string?",
    remindMeType: "string?",
    remindContactAt: "date?",
    remindMeAt: "date?",
    status: "string",
    isRecurring: "bool",
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

// ---------------- Realm Instance ---------------- //
let realm = new Realm({
  schema: [
    UserSchema,
    AccountSchema,
    ContactSchema,
    TransactionSchema,
    CodeListSchema,
    CodeListElementSchema,
    UserCodeListElementSchema,
    ReportSchema,
    SyncLogSchema, // Add SyncLogSchema
  ],
  schemaVersion: 1,
});
export { realm };

// ---------------- Generic CRUD Helpers ---------------- //
export const initializeRealm = async () => {
  try {
    if (!realm || realm.isClosed) {
      realm = await Realm.open({
        schema: [
          UserSchema,
          AccountSchema,
          ContactSchema,
          TransactionSchema,
          CodeListSchema,
          CodeListElementSchema,
          UserCodeListElementSchema,
          ReportSchema,
          SyncLogSchema, // Add SyncLogSchema
        ],
        schemaVersion: 1,
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
