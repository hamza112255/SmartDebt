import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Platform,
    Modal,
    Animated,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Alert,
    ActivityIndicator,
    Image,
    Dimensions,
    FlatList,
    Switch,
    TextInput
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { screens } from '../constant/screens';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { realm } from '../realm';
import * as ImagePicker from 'expo-image-picker';
import moment from 'moment';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { createTransactionInSupabase, deleteTransactionInSupabase, updateTransactionInSupabase } from '../supabase';
import NetInfo from '@react-native-community/netinfo';
import styles from '../css/newRecordCss';
import StyledPicker from '../components/shared/StyledPicker';
import StyledTextInput from '../components/shared/StyledTextInput';

const colors = {
    primary: '#667eea',
    primaryDark: '#5a67d8',
    secondary: '#764ba2',
    success: '#48bb78',
    successLight: '#68d391',
    error: '#f56565',
    errorLight: '#fc8181',
    background: '#f7fafc',
    white: '#ffffff',
    gray: '#718096',
    lightGray: '#e2e8f0',
    darkGray: '#4a5568',
    border: '#e2e8f0',
    activeBorder: '#667eea',
    textPrimary: '#2d3748',
    textSecondary: '#718096',
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.4)',
    cardShadow: 'rgba(102, 126, 234, 0.15)',
};

const currencies = [
    { label: 'PKR', value: 'PKR' },
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
    { label: 'GBP', value: 'GBP' },
    { label: 'INR', value: 'INR' },
];

const mapUiTypeToStorageType = (uiType) => {
    if (['cash_in', 'receive', 'credit'].includes(uiType)) return 'credit';
    if (['cash_out', 'send_out', 'debit'].includes(uiType)) return 'debit';
    return uiType; // for 'borrow', 'lend'
};

const getUiTypeFromStorageType = (storageType, accountType) => {
    if (!accountType) return storageType; 

    if (storageType === 'credit') {
        if (accountType === 'cash_in_out') return 'cash_in';
        if (accountType === 'receive_send') return 'receive';
        if (accountType === 'debit_credit') return 'credit';
    }
    if (storageType === 'debit') {
        if (accountType === 'cash_in_out') return 'cash_out';
        if (accountType === 'receive_send') return 'send_out';
        if (accountType === 'debit_credit') return 'debit';
    }
    return storageType; // 'borrow', 'lend', and fallbacks
};

const allTransactionTypes = [
    { label: 'Credit', value: 'credit' },
    { label: 'Debit', value: 'debit' },
    { label: 'Borrow', value: 'borrow' },
    { label: 'Lend', value: 'lend' },
    { label: 'Cash In', value: 'cash_in' },
    { label: 'Cash Out', value: 'cash_out' },
    { label: 'Receive', value: 'receive' },
    { label: 'Send Out', value: 'send_out' },
];

function mapTypeForSupabase(type) {
    if (['cash_in', 'receive', 'credit'].includes(type)) return 'credit';
    if (['cash_out', 'send_out', 'debit'].includes(type)) return 'debit';
    if (['borrow'].includes(type)) return 'borrow';
    if (['lend'].includes(type)) return 'lend';
    return type;
}

const transactionTypeMapping = {
    'cash_in_out': ['cash_in', 'cash_out'],
    'debit_credit': ['credit', 'debit'],
    'receive_send': ['receive', 'send_out'],
    'borrow_lend': ['borrow', 'lend'],
};

const NewRecordScreen = ({ navigation, route }) => {
    const { t } = useTranslation();
    const {
        transactionId,
        accountId,
        userId,
        sourceScreen, // 'account' or 'calendar'
        isDuplicating // Add this parameter to check if we're duplicating a transaction
    } = route.params || {};
    const [type, setType] = useState('');
    const [availableTypes, setAvailableTypes] = useState(allTransactionTypes);
    const [transactionDate, setTransactionDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isTimeFocused, setIsTimeFocused] = useState(false);
    const [isDateFocused, setIsDateFocused] = useState(false);
    const [purpose, setPurpose] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState(realm.objectForPrimaryKey('Account', accountId)?.currency || 'PKR');
    const [remarks, setRemarks] = useState('');
    const [imageUri, setImageUri] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [originalTransaction, setOriginalTransaction] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [contactPerson, setContactPerson] = useState(''); // stores contactId
    const [contactName, setContactName] = useState(''); // human-readable name
    const [contacts, setContacts] = useState([]);
    const [showContactModal, setShowContactModal] = useState(false);
    const [isAmountFocused, setIsAmountFocused] = useState(false);
    const [isPurposeFocused, setIsPurposeFocused] = useState(false);
    const [isRemarksFocused, setIsRemarksFocused] = useState(false);
    const [showContactOptionsModal, setShowContactOptionsModal] = useState(false);
    const [showContactDropdown, setShowContactDropdown] = useState(false);
    const [purposes, setPurposes] = useState([]);
    const [showPurposeModal, setShowPurposeModal] = useState(false);
    const [newPurpose, setNewPurpose] = useState('');
    const [showNewPurposeModal, setShowNewPurposeModal] = useState(false);
    const [userType, setUserType] = useState('free');
    const [isProxyPayment, setIsProxyPayment] = useState(false);
    const [onBehalfOfContactId, setOnBehalfOfContactId] = useState('');
    const [onBehalfOfContactName, setOnBehalfOfContactName] = useState('');
    const [showOnBehalfDropdown, setShowOnBehalfDropdown] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(hp(50))).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    // Keep track of accountType for useEffect dependencies
    const [accountType, setAccountType] = useState('');

    // Handle initial mount and transaction edit mode
    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();

        if (transactionId) {
            setIsEditing(!isDuplicating); // Only set editing mode if not duplicating
            loadTransactionData();
        } else {
            // Set a default type for new transactions
            setType('credit');
        }
    }, [transactionId, isDuplicating, loadTransactionData]);

    // Re-compute available types if accountId changes
    useEffect(() => {
        if (!accountId) return;
        const account = realm.objectForPrimaryKey('Account', accountId);
        if (!account) return;
        
        const accountType = account.type;
        const relevantTypeValues = transactionTypeMapping[accountType] || [];
        const filteredTypes = allTransactionTypes.filter(t => relevantTypeValues.includes(t.value));

        setAvailableTypes(filteredTypes.length > 0 ? filteredTypes : allTransactionTypes);

        // Only set default type for NEW transactions
        if (!transactionId) {
            setType(filteredTypes[0]?.value || allTransactionTypes[0]?.value || '');
        }
    }, [accountId, transactionId]);

    // Contact fetching
    useEffect(() => {
        const fetchContacts = () => {
            try {
                const results = realm
                    .objects('Contact')
                    .filtered('userId == $0 AND isActive == true', userId)
                    .sorted('name');
                setContacts(Array.from(results));

                if (contactPerson) {
                    const found = results.find((c) => c.id === contactPerson);
                    if (found && !contactName) {
                        setContactName(found.name);
                    }
                }
            } catch (error) {
                console.error('Error fetching contacts:', error);
                safeAlert('Error', 'Failed to load contacts');
            }
        };

        fetchContacts();
        const contactListener = (collection, changes) => {
            if (changes.insertions?.length || changes.deletions?.length || changes.modifications?.length) {
                fetchContacts();
            }
        };

        realm.objects('Contact').addListener(contactListener);
        return () => realm.objects('Contact').removeListener(contactListener);
    }, [userId, contactPerson]);

    // Purpose fetching from Realm
    useEffect(() => {
        // Fetch purposes from Realm
        const systemPurposes = realm.objects('CodeListElement')
            .filtered('codeListName == "transaction_purposes" && active == true')
            .sorted('sortOrder');
        const userPurposes = realm.objects('UserCodeListElement')
            .filtered('codeListName == "transaction_purposes" && active == true && userId == $0', userId)
            .sorted('sortOrder');
        const allPurposes = [...Array.from(systemPurposes), ...Array.from(userPurposes)];
        setPurposes(allPurposes);
        
        // Realm change listener
        const listener = () => {
            const updatedSystem = realm.objects('CodeListElement')
                .filtered('codeListName == "transaction_purposes" && active == true')
                .sorted('sortOrder');
            const updatedUser = realm.objects('UserCodeListElement')
                .filtered('codeListName == "transaction_purposes" && active == true && userId == $0', userId)
                .sorted('sortOrder');
            setPurposes([...Array.from(updatedSystem), ...Array.from(updatedUser)]);
        };
        
        systemPurposes.addListener(listener);
        userPurposes.addListener(listener);
        return () => {
            systemPurposes.removeListener(listener);
            userPurposes.removeListener(listener);
        };
    }, [userId]);

    const loadTransactionData = useCallback(() => {
        if (!transactionId) return;
        try {
            const transaction = realm.objectForPrimaryKey('Transaction', transactionId);
            console.log('transaction', transaction)
            if (transaction) {
                setOriginalTransaction(transaction);

                // No need for getUiTypeFromStorageType as types are now direct
                setType(transaction.type);
                
                setAmount(transaction.amount?.toString() || '');
                setRemarks(transaction.remarks || '');
                setPurpose(transaction.purpose || '');
                setImageUri(transaction.photoUrl || null);
                setContactPerson(transaction.contactId || '');

                if (transaction.contactId) {
                    const contact = realm.objectForPrimaryKey('Contact', transaction.contactId);
                    setContactName(contact?.name || '');
                }

                setIsProxyPayment(transaction.is_proxy_payment || false);
                setOnBehalfOfContactId(transaction.on_behalf_of_contact_id || '');
                if (transaction.on_behalf_of_contact_id) {
                    const onBehalfContact = realm.objectForPrimaryKey('Contact', transaction.on_behalf_of_contact_id);
                    setOnBehalfOfContactName(onBehalfContact?.name || '');
                }

                setTransactionDate(transaction.transactionDate || new Date());
            }
        } catch (error) {
            console.error('Error loading transaction:', error);
            safeAlert('Error', 'Failed to load transaction data');
        }
    }, [transactionId, isDuplicating]);

    const pickImage = useCallback(async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets[0].uri) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            console.log('Error picking image:', error);
        }
    }, []);

    // Fetch userType from Realm
    useEffect(() => {
        if (userId) {
            const user = realm.objectForPrimaryKey('User', userId);
            setUserType(user?.userType || 'free');
        }
    }, [userId]);

    // Exclude selected contacts from each other's dropdowns
    const availableContactsForContact = contacts.filter(c => c.id !== onBehalfOfContactId);
    const availableContactsForOnBehalf = contacts.filter(c => c.id !== contactPerson);

    // Show proxy switch only for paid users and send-out/cash-out/lend/debit types
    const showProxySwitch = userType === 'paid' && (
        ['send_out', 'cash_out', 'lend', 'debit'].includes(type)
    );

    // Helper: update account balance for a transaction (like your SQL trigger)
    function updateAccountBalance(account, tx, isRevert = false) {
        const amount = parseFloat(tx.amount) || 0;
        const type = tx.type;
        let receivingChange = 0;
        let sendingChange = 0;
        let balanceChange = 0;

        // Only update if not a proxy adjustment
        if (tx.on_behalf_of_contact_id == null || tx.on_behalf_of_contact_id === '') {
            if (['credit', 'borrow', 'cash_in', 'receive'].includes(type)) {
                receivingChange = amount;
                balanceChange = amount;
            } else { // debit, lend, cash_out, send_out
                sendingChange = amount;
                balanceChange = -amount;
            }

            if (isRevert) {
                receivingChange = -receivingChange;
                sendingChange = -sendingChange;
                balanceChange = -balanceChange;
            }

            account.receiving_money = (account.receiving_money || 0) + receivingChange;
            account.sending_money = (account.sending_money || 0) + sendingChange;
            account.currentBalance = (account.currentBalance || 0) + balanceChange;
            account.updatedOn = new Date();
        }
    }

    // Helper: create debt adjustment transaction for proxy payment
    function createDebtAdjustmentTransaction({
        mainTransaction,
        user,
        account,
        contacts,
        onBehalfOfContactId,
        isAppUser,
        onBehalfUserId,
        netOn,
        paid
    }) {
        // Find onBehalf contact
        const onBehalfContact = contacts.find(c => c.id === onBehalfOfContactId);
        const recipientContact = contacts.find(c => c.id === mainTransaction.contactId);
        let debtAdjustmentTransaction = null;
        let proxyPaymentId = Date.now().toString() + '_proxy';
        let debtAdjustmentAmount = mainTransaction.amount;
        let remarks = '';
        let debtAdjustmentType = '';
        let debtAdjustmentAccountId = '';
        let debtAdjustmentUserId = '';
        let debtAdjustmentContactId = '';
        let debtAdjustmentPurpose = 'New debt - proxy payment';

        if (isAppUser && onBehalfUserId) {
            // Alice is app user, create debt adjustment in Alice's account
            // Find Bob's contact in Alice's contacts
            const payerContactInAlice = realm.objects('Contact')
                .filtered('userId == $0 && contactUserId == $1', onBehalfUserId, user.id)[0];
            debtAdjustmentAccountId = realm.objects('Account').filtered('userId == $0', onBehalfUserId)[0]?.id;
            debtAdjustmentUserId = onBehalfUserId;
            debtAdjustmentContactId = payerContactInAlice?.id;
            debtAdjustmentType = 'borrow';
            remarks = `New debt: ${user.firstName || ''} paid ${recipientContact?.name || ''} $${mainTransaction.amount} on my behalf`;

            debtAdjustmentTransaction = {
                id: Date.now().toString() + '_debt',
                type: debtAdjustmentType,
                purpose: debtAdjustmentPurpose || '',
                amount: debtAdjustmentAmount,
                accountId: debtAdjustmentAccountId || '',
                userId: debtAdjustmentUserId || '',
                contactId: debtAdjustmentContactId || '',
                transactionDate: mainTransaction.transactionDate,
                remarks: remarks || '',
                status: 'completed',
                isRecurring: false,
                is_proxy_payment: false,
                on_behalf_of_contact_id: null,
                recurringPattern: '', // always string
                parentTransactionId: '', // always string
                isSettled: false,
                settledAt: null,
                settlementNote: '',
                createdOn: new Date(),
                updatedOn: new Date(),
                syncStatus: netOn && paid ? 'synced' : 'pending',
                lastSyncAt: netOn && paid ? new Date() : null,
                needsUpload: !(netOn && paid)
            };
        } else {
            // Alice is not app user, create debt adjustment in Bob's account
            debtAdjustmentAccountId = mainTransaction.accountId;
            debtAdjustmentUserId = mainTransaction.userId;
            debtAdjustmentContactId = onBehalfOfContactId;
            debtAdjustmentType = 'lend';
            remarks = `New debt: paid $${mainTransaction.amount} to ${recipientContact?.name || ''} on behalf of ${onBehalfContact?.name || ''}`;

            debtAdjustmentTransaction = {
                id: Date.now().toString() + '_debt',
                type: debtAdjustmentType,
                purpose: debtAdjustmentPurpose || '',
                amount: debtAdjustmentAmount,
                accountId: debtAdjustmentAccountId || '',
                userId: debtAdjustmentUserId || '',
                contactId: debtAdjustmentContactId || '',
                transactionDate: mainTransaction.transactionDate,
                remarks: remarks || '',
                status: 'completed',
                isRecurring: false,
                is_proxy_payment: false,
                on_behalf_of_contact_id: null,
                recurringPattern: '', // always string
                parentTransactionId: '', // always string
                isSettled: false,
                settledAt: null,
                settlementNote: '',
                createdOn: new Date(),
                updatedOn: new Date(),
                syncStatus: netOn && paid ? 'synced' : 'pending',
                lastSyncAt: netOn && paid ? new Date() : null,
                needsUpload: !(netOn && paid)
            };
        }

        // Create ProxyPayment record
        const proxyPayment = {
            id: proxyPaymentId,
            payerUserId: mainTransaction.userId || '',
            onBehalfOfUserId: isAppUser ? (onBehalfUserId || '') : '',
            recipientContactId: mainTransaction.contactId || '',
            amount: mainTransaction.amount,
            originalTransactionId: mainTransaction.id || '',
            debtAdjustmentTransactionId: debtAdjustmentTransaction.id || '',
            notificationSent: false,
            createdOn: new Date(),
            updatedOn: new Date()
        };

        // Save both in Realm
        realm.create('Transaction', debtAdjustmentTransaction);
        // Update account balance for debt adjustment
        const adjAccount = realm.objectForPrimaryKey('Account', debtAdjustmentAccountId);
        if (adjAccount) {
            updateAccountBalance(adjAccount, debtAdjustmentTransaction, false);
        }
        realm.create('ProxyPayment', proxyPayment);
    }

    // Helper: convert empty string to null for UUID and enum fields before sending to Supabase
    function supabaseSafe(obj, nullFields = []) {
        const out = { ...obj };
        nullFields.forEach(field => {
            if (out[field] === '' || out[field] === undefined) out[field] = null;
        });
        return out;
    }

    const handleSave = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            // Validate inputs
            if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
                throw new Error('Please enter a valid amount');
            }
            if (!type) {
                throw new Error('Please select a transaction type');
            }
            if (!accountId) {
                throw new Error('Account ID is missing');
            }

            // Prepare transaction data
            const transactionData = {
                id: isEditing && transactionId ? transactionId : new Date().toISOString(),
                type: mapUiTypeToStorageType(type),
                purpose: purpose || '',
                amount: parseFloat(amount) || 0,
                accountId: accountId || '',
                userId: userId || '',
                contactId: contactPerson || '',
                transactionDate: transactionDate,
                remarks: remarks || '',
                photoUrl: imageUri || '',
                remindToContact: false,
                remindMe: false,
                remindToContactType: '',
                remindMeType: '',
                remindContactAt: null,
                remindMeAt: null,
                status: 'completed',
                isRecurring: false,
                is_proxy_payment: showProxySwitch ? isProxyPayment : false,
                on_behalf_of_contact_id: showProxySwitch && isProxyPayment && onBehalfOfContactId ? onBehalfOfContactId : '',
                recurringPattern: '',
                parentTransactionId: '',
                isSettled: false,
                settledAt: null,
                settlementNote: '',
                createdOn: isEditing && originalTransaction ? originalTransaction.createdOn : new Date(),
                updatedOn: new Date(),
                syncStatus: 'pending',
                lastSyncAt: null,
                needsUpload: true
            };

            const user = realm.objectForPrimaryKey('User', userId);
            const supabaseUserId = user?.supabaseId;
            const netState = await NetInfo.fetch();
            const netOn = netState.isConnected && netState.isInternetReachable;
            const paid = user?.userType === 'paid';

            // Find contacts for proxy logic
            const allContacts = Array.from(realm.objects('Contact').filtered('userId == $0 AND isActive == true', userId));
            let onBehalfContact = onBehalfOfContactId ? realm.objectForPrimaryKey('Contact', onBehalfOfContactId) : null;
            let isAppUser = !!onBehalfContact?.contactUserId;
            let onBehalfUserId = onBehalfContact?.contactUserId || null;

            // Get the account for balance updates
            const mainAccount = realm.objectForPrimaryKey('Account', accountId);
            if (!mainAccount) {
                throw new Error('Account not found');
            }

            // STEP 1: Handle all local database operations first (synchronously)
            let finalTransactionId = transactionData.id; // Keep track of final ID

            realm.write(() => {
                if (isEditing) {
                    // --- UPDATE LOGIC ---
                    const existingTransaction = realm.objectForPrimaryKey('Transaction', transactionId);
                    if (!existingTransaction) {
                        throw new Error('Transaction not found');
                    }

                    // Revert the original transaction's effect on balance
                    updateAccountBalance(mainAccount, existingTransaction, true);

                    // Apply new transaction effect
                    updateAccountBalance(mainAccount, transactionData, false);

                    // Update transaction locally
                    realm.create('Transaction', transactionData, 'modified');

                    // Check if a 'create' log already exists for this unsynced record.
                    const createLog = realm.objects('SyncLog').filtered('recordId == $0 AND operation == "create" AND (status == "pending" OR status == "failed")', transactionId)[0];

                    if (!createLog) {
                        // Only create an 'update' log if the record has been synced before.
                        realm.create('SyncLog', {
                            id: Date.now().toString() + '_log',
                            userId: userId,
                            tableName: 'transactions',
                            recordId: transactionData.id,
                            operation: 'update',
                            status: 'pending',
                            createdOn: new Date(),
                            processedAt: null
                        });
                    }

                    // Handle proxy payment updates
                    if (transactionData.is_proxy_payment && transactionData.on_behalf_of_contact_id) {
                        // Delete existing proxy payment and debt adjustment
                        const proxyPayment = realm.objects('ProxyPayment').filtered('originalTransactionId == $0', transactionId)[0];
                        if (proxyPayment) {
                            if (proxyPayment.debtAdjustmentTransactionId) {
                                const debtTx = realm.objectForPrimaryKey('Transaction', proxyPayment.debtAdjustmentTransactionId);
                                if (debtTx) {
                                    const adjAccount = realm.objectForPrimaryKey('Account', debtTx.accountId);
                                    if (adjAccount) {
                                        updateAccountBalance(adjAccount, debtTx, true);
                                    }
                                    realm.delete(debtTx);
                                }
                            }
                            realm.delete(proxyPayment);
                        }
                        // Create new debt adjustment and proxy payment
                        createDebtAdjustmentTransaction({
                            mainTransaction: transactionData,
                            user,
                            account: mainAccount,
                            contacts: allContacts,
                            onBehalfOfContactId,
                            isAppUser,
                            onBehalfUserId,
                            netOn,
                            paid
                        });
                    }
                } else {
                    // --- CREATE LOGIC ---
                    updateAccountBalance(mainAccount, transactionData, false);

                    // Create transaction locally
                    realm.create('Transaction', transactionData);

                    // Create sync log for main transaction only
                    realm.create('SyncLog', {
                        id: Date.now().toString() + '_log',
                        userId: userId,
                        tableName: 'transactions',
                        recordId: transactionData.id,
                        operation: 'create',
                        status: 'pending',
                        createdOn: new Date(),
                        processedAt: null
                    });

                    // Handle proxy payments for new transactions
                    if (transactionData.is_proxy_payment && transactionData.on_behalf_of_contact_id) {
                        createDebtAdjustmentTransaction({
                            mainTransaction: transactionData,
                            user,
                            account: mainAccount,
                            contacts: allContacts,
                            onBehalfOfContactId,
                            isAppUser,
                            onBehalfUserId,
                            netOn,
                            paid
                        });
                    }
                }
            });

            // STEP 2: Handle Supabase sync operations (asynchronously, outside of realm.write)
            if (paid && netOn) {
                try {
                    // List all fields that must be null if empty (UUIDs and enums)
                    const nullFields = [
                        'contactId',
                        'on_behalf_of_contact_id',
                        'parentTransactionId',
                        'recurringPattern',
                        'accountId',
                        'userId',
                        'remindToContactType',
                        'remindMeType'
                    ];
                    // Prepare payload for Supabase
                    const supabaseTxData = supabaseSafe(
                        { ...transactionData }, // type is already mapped
                        nullFields
                    );

                    let supaTx;
                    if (isEditing) {
                        supaTx = await updateTransactionInSupabase(transactionData.id, supabaseTxData);
                    } else {
                        supaTx = await createTransactionInSupabase(supabaseTxData, supabaseUserId, {});
                        finalTransactionId = supaTx.id; // Get the new ID from Supabase
                    }

                    // Update sync status in a separate write transaction
                    realm.write(() => {
                        const currentTxId = isEditing ? transactionId : transactionData.id;
                        const txToUpdate = realm.objectForPrimaryKey('Transaction', currentTxId);

                        if (txToUpdate) {
                            // If this is a new transaction and we got a new ID from Supabase, we need to handle the ID change
                            if (!isEditing && finalTransactionId !== transactionData.id) {
                                // Delete the old transaction with temporary ID
                                realm.delete(txToUpdate);

                                // Create new transaction with Supabase ID
                                realm.create('Transaction', {
                                    ...transactionData,
                                    id: finalTransactionId,
                                    syncStatus: 'synced',
                                    needsUpload: false,
                                    lastSyncAt: new Date(),
                                    createdOn: supaTx.created_on ? new Date(supaTx.created_on) : transactionData.createdOn,
                                    updatedOn: supaTx.updated_on ? new Date(supaTx.updated_on) : new Date(),
                                });

                                // --- Update ProxyPayment originalTransactionId if exists ---
                                if (transactionData.is_proxy_payment && transactionData.on_behalf_of_contact_id) {
                                    // Find ProxyPayment by old temp transaction ID
                                    const proxyPayment = realm.objects('ProxyPayment').filtered('originalTransactionId == $0', transactionData.id)[0];
                                    if (proxyPayment) {
                                        realm.create('ProxyPayment', {
                                            ...proxyPayment.toJSON(),
                                            originalTransactionId: finalTransactionId,
                                            updatedOn: new Date()
                                        }, 'modified');
                                    }
                                }
                            } else {
                                // Just update the existing transaction
                                realm.create('Transaction', {
                                    ...txToUpdate,
                                    syncStatus: 'synced',
                                    needsUpload: false,
                                    lastSyncAt: new Date(),
                                    createdOn: supaTx.created_on ? new Date(supaTx.created_on) : txToUpdate.createdOn,
                                    updatedOn: supaTx.updated_on ? new Date(supaTx.updated_on) : new Date(),
                                }, 'modified');
                            }

                            // Update sync log status
                            const syncLog = realm.objects('SyncLog').filtered('recordId == $0 AND status == "pending"', currentTxId).sorted('createdOn', true)[0];
                            if (syncLog) {
                                realm.create('SyncLog', {
                                    ...syncLog,
                                    recordId: finalTransactionId, // Update to final ID
                                    status: 'completed',
                                    processedAt: new Date()
                                }, 'modified');
                            }
                        }
                    });

                } catch (supabaseError) {
                    console.error('Supabase sync error:', supabaseError);
                    // Sync failed, but local transaction is already saved
                    // The sync log will remain as 'pending' for later retry
                }
            }

            // STEP 3: Trigger callback first, then show success alert
            // Trigger the callback if provided (check both possible parameter names)
            // const callback = route.params?.onTransactionSaved || route.params?.onSave;
            // if (callback && typeof callback === 'function') {
            //     try {
            //         callback();
            //     } catch (callbackError) {
            //         console.error('Error in callback:', callbackError);
            //         // Don't throw here, just log the error
            //     }
            // }

            // Show success alert and navigate back only when user clicks OK
            Alert.alert(
                t('common.success'),
                t('addNewRecordScreen.alerts.success.save'),
                [
                    {
                        text: t('common.ok'),
                        onPress: () => {
                            // Navigate back only when user clicks OK
                            navigation.goBack();
                        }
                    }
                ],
                { cancelable: false } // Prevent dismissing by tapping outside
            );

        } catch (error) {
            console.error('Error saving transaction:', error);
            safeAlert('Error', 'Failed to save transaction: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    }, [
        isLoading, amount, type, accountId, userId, transactionId, originalTransaction, isEditing,
        contactPerson, transactionDate, remarks, purpose, imageUri, navigation,
        isProxyPayment, onBehalfOfContactId, showProxySwitch, userType,
        route.params?.onTransactionSaved, route.params?.onSave, isDuplicating, originalTransaction
    ]);

    const handleCancel = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    useEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <TouchableOpacity onPress={handleCancel}>
                    <Text style={styles.headerButton}>{t('common.cancel')}</Text>
                </TouchableOpacity>
            ),
            headerRight: () => (
                <TouchableOpacity onPress={handleSave}>
                    <Text style={styles.headerButton}>{t('common.save')}</Text>
                </TouchableOpacity>
            )
        });
    }, [navigation, handleSave, handleCancel]);

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: showModal ? 0 : hp(50),
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();
    }, [showModal]);

    const closeBottomSheet = () => setShowModal(false);

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || transactionDate;
        setShowDatePicker(Platform.OS === 'ios');
        setTransactionDate(currentDate);
        setIsDateFocused(false);
    };

    const onTimeChange = (event, selectedTime) => {
        if (selectedTime) {
            const newDate = new Date(transactionDate);
            newDate.setHours(selectedTime.getHours());
            newDate.setMinutes(selectedTime.getMinutes());
            setTransactionDate(newDate);
        }
        setShowTimePicker(Platform.OS === 'ios');
        setIsTimeFocused(false);
    };

    const formatDate = (date) => {
        return moment(date).format('ddd, MMM DD, YYYY');
    };

    const formatTime = (date) => {
        return moment(date).format('hh:mm A');
    };

    // Contact handling functions
    const handleContactPress = useCallback(() => {
        if (contacts.length > 0) {
            setShowContactDropdown(!showContactDropdown);
        } else {
            setShowContactOptionsModal(true);
        }
    }, [contacts]);

    const handleSelectContact = useCallback((contact) => {
        setContactPerson(contact.id);
        setContactName(contact.name);
        setShowContactDropdown(false);
    }, []);

    // Add this handler for the "on behalf of" contact selection
    const handleSelectOnBehalfContact = useCallback((contact) => {
        setOnBehalfOfContactId(contact.id);
        setOnBehalfOfContactName(contact.name);
        setShowOnBehalfDropdown(false);
    }, []);

    const handleAddNewContact = () => {
        setShowContactModal(false);
        setShowContactOptionsModal(true);
    };

    const handleContactOptionSelect = (option) => {
        setShowContactOptionsModal(false);
        if (option === 'create') {
            navigation.navigate('NewContact', {
                userId,
                onGoBack: (newContact) => {
                    if (newContact) {
                        setContactPerson(newContact.id);
                        setContactName(newContact.name);
                        const results = realm
                            .objects('Contact')
                            .filtered('userId == $0 AND isActive == true', userId)
                            .sorted('name');
                        setContacts(Array.from(results));
                    }
                },
            });
        } else if (option === 'import') {
            navigation.navigate('ImportContacts', {
                userId,
                onGoBack: (selectedContacts) => {
                    if (selectedContacts?.length) {
                        setContactPerson(selectedContacts[0].id);
                        setContactName(selectedContacts[0].name);
                        const results = realm
                            .objects('Contact')
                            .filtered('userId == $0 AND isActive == true', userId)
                            .sorted('name');
                        setContacts(Array.from(results));
                    }
                },
            });
        }
    };

    // Import device contacts
    const importFromDeviceContacts = async () => {
        try {
            const permission = await Contacts.requestPermission();
            if (permission === 'authorized') {
                const contacts = await Contacts.getAll();
                realm.write(() => {
                    contacts.forEach((c) => {
                        const id = new Date().toISOString();
                        realm.create('Contact', {
                            id,
                            name: c.displayName || '',
                            phone: c.phoneNumbers && c.phoneNumbers.length ? c.phoneNumbers[0].number : '',
                            email: c.emails && c.emails.length ? c.emails[0].email : '',
                            photoUrl: c.thumbnailPath || '',
                            userId,
                            totalOwed: 0,
                            totalOwing: 0,
                            isActive: true,
                            createdOn: new Date(),
                            updatedOn: new Date(),
                            syncStatus: 'pending',
                            needsUpload: true,
                            lastSyncAt: null,
                        });
                    });
                });

                const results = realm
                    .objects('Contact')
                    .filtered('userId == $0 AND isActive == true', userId)
                    .sorted('name');
                setContacts(Array.from(results));
                setShowModal(false);
            }
        } catch (err) {
            console.error('Import contacts error', err);
            safeAlert('Error', 'Failed to import contacts');
        }
    };

    // Contact Options Modal
    const ContactOptionsModal = () => (
        <Modal
            visible={showContactOptionsModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowContactOptionsModal(false)}
        >
            <TouchableWithoutFeedback onPress={() => setShowContactOptionsModal(false)}>
                <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>

            <View style={styles.bottomSheetContainer}>
                <View style={styles.bottomSheetContent}>
                    <View style={styles.bottomSheetHandle} />
                    <Text style={styles.bottomSheetTitle}>{t('addContact')}</Text>

                    <TouchableOpacity
                        style={styles.bottomSheetOption}
                        onPress={() => handleContactOptionSelect('create')}
                    >
                        <Text style={styles.bottomSheetText}>{t('createNewContact')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.bottomSheetOption}
                        onPress={() => handleContactOptionSelect('import')}
                    >
                        <Text style={styles.bottomSheetText}>{t('importFromContact')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.bottomSheetCancel}
                        onPress={() => setShowContactOptionsModal(false)}
                    >
                        <Text style={styles.bottomSheetCancelText}>{t('cancelContact')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const safeAlert = (title, message) => {
        if (!navigation.isFocused()) return;
        Alert.alert(title, message);
    };

    const handleAddNewPurpose = () => {
        if (!newPurpose.trim()) {
            Alert.alert('Error', 'Please enter a purpose');
            return;
        }

        try {
            realm.write(() => {
                const newPurposeItem = realm.create('UserCodeListElement', {
                    id: Date.now().toString(),
                    codeListName: 'transaction_purposes',
                    element: newPurpose.trim(),
                    description: newPurpose.trim(),
                    active: true,
                    userId: userId,
                    sortOrder: 1000,
                    createdOn: new Date(),
                    updatedOn: new Date(),
                    syncStatus: 'pending',
                    needsUpload: true
                });

                // Create sync log
                realm.create('SyncLog', {
                    id: Date.now().toString() + '_log',
                    userId: userId,
                    tableName: 'user_code_list_elements',
                    recordId: newPurposeItem.id,
                    operation: 'create',
                    status: 'pending',
                    createdOn: new Date(),
                    processedAt: null
                });
            });

            setPurpose(newPurpose.trim());
            setNewPurpose('');
            setShowNewPurposeModal(false);
            Alert.alert('Success', 'Purpose added successfully');
        } catch (error) {
            console.error('Error saving new purpose:', error);
            Alert.alert('Error', 'Failed to save new purpose');
        }
    };

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity onPress={handleSave}>
                    <Text style={styles.headerButton}>{t('common.save')}</Text>
                </TouchableOpacity>
            )
        });
    }, [navigation, handleSave]);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.header}
                    >
                        <Text style={styles.headerTitle}>
                            {isEditing ? t('newRecordScreen.editTitle') : isDuplicating ? t('newRecordScreen.duplicateTitle', 'Duplicate Transaction') : t('newRecordScreen.title')}
                        </Text>
                        <View style={styles.placeholder} />
                    </LinearGradient>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* On behalf of switch and contact field */}
                        {showProxySwitch && (
                            <View style={styles.cardContainer}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={styles.sectionTitle}>{t('newRecordScreen.onBehalfOf')}</Text>
                                    <Switch
                                        value={isProxyPayment}
                                        onValueChange={setIsProxyPayment}
                                        style={{ marginLeft: 12 }}
                                    />
                                </View>
                                {isProxyPayment && (
                                    <View>
                                        <StyledPicker
                                            label={t('newRecordScreen.onBehalfOfContact')}
                                            selectedValue={onBehalfOfContactId}
                                            onValueChange={setOnBehalfOfContactId}
                                            items={availableContactsForOnBehalf.map(c => ({ label: c.name, value: c.id }))}
                                            icon="person-outline"
                                            renderFooter={(closeModal) => (
                                                <TouchableOpacity
                                                    style={styles.addContactBtn}
                                                    onPress={() => {
                                                        closeModal();
                                                        setShowContactOptionsModal(true);
                                                    }}
                                                >
                                                    <Icon name="add" size={20} color={colors.primary} />
                                                    <Text style={styles.addContactBtnText}>{t('addNewContact')}</Text>
                                                </TouchableOpacity>
                                            )}
                                        />
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.cardContainer}>
                            <Text style={styles.sectionTitle}>{t('newRecordScreen.typeLabel')}</Text>
                            <View style={styles.typeContainer}>
                                {availableTypes.map((item) => (
                                    <TouchableOpacity
                                        key={item.value}
                                        style={[
                                            styles.typeButton,
                                            type === item.value && styles.typeButtonActive
                                        ]}
                                        onPress={() => setType(item.value)}
                                    >
                                        <Text style={[
                                            styles.typeButtonText,
                                            type === item.value && styles.typeButtonTextActive
                                        ]}>
                                            {t(`terms.${item.value}`)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.cardContainer}>
                            <Text style={styles.sectionTitle}>{t('newRecordScreen.dateLabel')}</Text>
                            <View style={styles.dateTimeRow}>
                                <TouchableOpacity
                                    style={[styles.dateTimeInput, isDateFocused && styles.inputFocused]}
                                    onPress={() => {
                                        setShowDatePicker(true);
                                        setIsDateFocused(true);
                                    }}
                                    activeOpacity={0.8}
                                    disabled={isLoading}
                                >
                                    <Icon name="calendar-today" size={RFValue(20)} color={colors.primary} />
                                    <Text style={styles.dateTimeText}>{formatDate(transactionDate)}</Text>
                                </TouchableOpacity>
                                <Text style={styles.sectionTitle}>{t('newRecordScreen.timeLabel')}</Text>
                                <TouchableOpacity
                                    style={[styles.dateTimeInput, isTimeFocused && styles.inputFocused]}
                                    onPress={() => {
                                        setShowTimePicker(true);
                                        setIsTimeFocused(true);
                                    }}
                                    activeOpacity={0.8}
                                    disabled={isLoading}
                                >
                                    <Icon name="access-time" size={RFValue(20)} color={colors.primary} />
                                    <Text style={styles.dateTimeText}>{formatTime(transactionDate)}</Text>
                                </TouchableOpacity>
                            </View>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={transactionDate}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                />
                            )}
                            {showTimePicker && (
                                <DateTimePicker
                                    value={transactionDate}
                                    mode="time"
                                    display="default"
                                    onChange={onTimeChange}
                                />
                            )}
                        </View>

                        {/* Main Contact field (exclude onBehalfOfContactId) */}
                        <View style={styles.cardContainer}>
                            <StyledPicker
                                label={t('newRecordScreen.contactLabel')}
                                selectedValue={contactPerson}
                                onValueChange={setContactPerson}
                                items={availableContactsForContact.map(c => ({ label: c.name, value: c.id }))}
                                icon="person"
                                renderFooter={(closeModal) => (
                                    <TouchableOpacity
                                        style={styles.addContactBtn}
                                        onPress={() => {
                                            closeModal();
                                            setShowContactOptionsModal(true);
                                        }}
                                    >
                                        <Icon name="add" size={20} color={colors.primary} />
                                        <Text style={styles.addContactBtnText}>{t('addNewContact')}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>

                        <View style={styles.cardContainer}>
                            <StyledPicker
                                label={t('newRecordScreen.purposeLabel')}
                                selectedValue={purpose}
                                onValueChange={setPurpose}
                                items={purposes.map(p => ({ label: p.description, value: p.element }))}
                                icon="assignment"
                                renderFooter={(closeModal) => (
                                    <TouchableOpacity
                                        style={styles.addContactBtn}
                                        onPress={() => {
                                            closeModal();
                                            setShowNewPurposeModal(true);
                                        }}
                                    >
                                        <Icon name="add" size={20} color={colors.primary} />
                                        <Text style={styles.addContactBtnText}>{t('newRecordScreen.addNewPurpose')}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>

                        <View style={styles.cardContainer}>
                            <StyledTextInput
                                label={t('newRecordScreen.amountLabel')}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                                placeholder="0.00"
                                currency={currency}
                                onFocus={() => setIsAmountFocused(true)}
                                onBlur={() => setIsAmountFocused(false)}
                                editable={!isLoading}
                            />
                        </View>

                        <View style={styles.cardContainer}>
                            <StyledTextInput
                                label={t('newRecordScreen.remarksLabel')}
                                value={remarks}
                                onChangeText={setRemarks}
                                placeholder={t('newRecordScreen.remarksPlaceholder')}
                                multiline
                                icon="note"
                                onFocus={() => setIsRemarksFocused(true)}
                                onBlur={() => setIsRemarksFocused(false)}
                                editable={!isLoading}
                            />
                        </View>

                        <View style={styles.cardContainer}>
                            <Text style={styles.sectionTitle}>{t('newRecordScreen.attachmentsLabel')}</Text>
                            <View style={styles.attachmentContainer}>
                                <TouchableOpacity
                                    style={[styles.attachmentButton, imageUri && styles.attachmentButtonWithImage]}
                                    activeOpacity={0.8}
                                    onPress={pickImage}
                                    disabled={isLoading}
                                >
                                    {imageUri ? (
                                        <View style={styles.imageContainer}>
                                            <Image
                                                source={{ uri: imageUri }}
                                                style={styles.imagePreview}
                                                resizeMode="contain"
                                            />
                                            <TouchableOpacity
                                                style={styles.removeImageButton}
                                                onPress={() => setImageUri(null)}
                                                activeOpacity={0.8}
                                            >
                                                <Icon name="close" size={RFValue(16)} color={colors.white} />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={styles.attachmentPlaceholder}>
                                            <Icon name="add-a-photo" size={RFValue(28)} color={colors.primary} />
                                            <Text style={styles.attachmentText}>{t('newRecordScreen.addNewPhoto')}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.floatingButtonsContainer}>
                        <LinearGradient
                            colors={['rgba(247, 250, 252, 0)', colors.background]}
                            style={styles.floatingButtonsGradient}
                        >
                            <View style={styles.floatingButtons}>
                                <TouchableOpacity
                                    style={[styles.floatingButton, styles.cancelButton]}
                                    onPress={handleCancel}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.buttonText, { color: colors.textSecondary }]}>{t('newRecordScreen.cancelButton')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.floatingButton, styles.saveButton]}
                                    onPress={handleSave}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, colors.primaryDark]}
                                        style={styles.saveButtonGradient}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color={colors.white} size="small" />
                                        ) : (
                                            <Text style={[styles.buttonText, { color: colors.white }]}>
                                                {isEditing ? t('newRecordScreen.updateButton') : isDuplicating ? t('newRecordScreen.duplicateButton', 'Duplicate') : t('newRecordScreen.saveButton')}
                                            </Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </View>

                    <Modal
                        transparent={true}
                        visible={showModal}
                        animationType="none"
                        onRequestClose={closeBottomSheet}
                    >
                        <TouchableWithoutFeedback onPress={closeBottomSheet}>
                            <View style={styles.modalOverlay} />
                        </TouchableWithoutFeedback>
                        <Animated.View style={[styles.bottomSheetContent, { transform: [{ translateY: slideAnim }] }]}>
                            <View style={styles.bottomSheetHandle} />
                            <Text style={styles.bottomSheetTitle}>{t('newRecordScreen.addContactLabel')}</Text>
                            <TouchableOpacity
                                style={styles.bottomSheetOption}
                                onPress={() => {
                                    navigation.navigate(screens.NewContact);
                                    setShowModal(false);
                                }}
                                activeOpacity={0.8}
                            >
                                <Icon name="person-add" size={RFValue(20)} color={colors.primary} />
                                <Text style={styles.bottomSheetText}>{t('newRecordScreen.createContactLabel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.bottomSheetOption}
                                onPress={importFromDeviceContacts}
                                activeOpacity={0.8}
                            >
                                <Icon name="contacts" size={RFValue(20)} color={colors.primary} />
                                <Text style={styles.bottomSheetText}>{t('newRecordScreen.importContactLabel')}</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </Modal>
                    <ContactOptionsModal />
                    <Modal
                        visible={showPurposeModal}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setShowPurposeModal(false)}
                    >
                        <TouchableWithoutFeedback onPress={() => setShowPurposeModal(false)}>
                            <View style={styles.modalOverlay} />
                        </TouchableWithoutFeedback>

                        <View style={styles.bottomSheetContainer}>
                            <View style={styles.bottomSheetContent}>
                                <View style={styles.bottomSheetHandle} />
                                <Text style={styles.bottomSheetTitle}>{t('newRecordScreen.selectPurpose')}</Text>
                                <FlatList
                                    data={purposes}
                                    keyExtractor={item => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.bottomSheetOption}
                                            onPress={() => {
                                                setPurpose(item.element);
                                                setShowPurposeModal(false);
                                            }}
                                        >
                                            <Text style={styles.bottomSheetText}>{item.description}</Text>
                                        </TouchableOpacity>
                                    )}
                                />
                                <TouchableOpacity
                                    style={styles.addNewButton}
                                    onPress={() => {
                                        setShowPurposeModal(false);
                                        setShowNewPurposeModal(true);
                                    }}
                                >
                                    <Text style={styles.addNewText}>+ {t('newRecordScreen.addNewPurpose')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                    <Modal
                        visible={showNewPurposeModal}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setShowNewPurposeModal(false)}
                    >
                        <View style={styles.modalContainer}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>{t('newRecordScreen.addNewPurpose')}</Text>
                                <StyledTextInput
                                    style={styles.modalInput}
                                    placeholder="Enter purpose name"
                                    value={newPurpose}
                                    onChangeText={setNewPurpose}
                                    autoFocus={true}
                                />
                                <View style={styles.modalButtonContainer}>
                                    <TouchableOpacity 
                                        style={[styles.modalButton, styles.cancelButton]}
                                        onPress={() => setShowNewPurposeModal(false)}
                                    >
                                        <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.modalButton, styles.saveButton]}
                                        onPress={handleAddNewPurpose}
                                    >
                                        <Text style={styles.modalButtonText}>{t('common.save')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                </Animated.View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default NewRecordScreen;