import Realm from "realm";

export const UserSchema = {
  name: "User",
  primaryKey: "id",
  properties: {
    id: "string",
    firstName: "string?",
    lastName: "string?",
    email: "string?",
    emailConfirmed: "bool",
    biometricEnabled: "bool",
    pinEnabled: "bool",
    pinCode: "string?",
    passwordHash: "string?",
    userType: "string", // 'free' or 'paid'
    profilePictureUrl: "string?",
    language: "string",
    timezone: "string?",
    isActive: "bool",
    lastLoginAt: "date?",
    createdOn: "date",
    updatedOn: "date",
    // Sync fields
    syncStatus: "string", // 'synced', 'pending', 'conflict'
    lastSyncAt: "date?",
    needsUpload: "bool",
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
    cashIn: { type: "double", default: 0 },
    cashOut: { type: "double", default: 0 },
    debit: { type: "double", default: 0 },
    credit: { type: "double", default: 0 },
    receive: { type: "double", default: 0 },
    sendOut: { type: "double", default: 0 },
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
