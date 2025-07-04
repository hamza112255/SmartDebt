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
import Realm from 'realm';
import * as ImagePicker from 'expo-image-picker';
import moment from 'moment';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { createTransactionInSupabase, deleteTransactionInSupabase, updateTransactionInSupabase } from '../supabase';
import NetInfo from '@react-native-community/netinfo';
import styles from '../css/newRecordCss';
import StyledPicker from '../components/shared/StyledPicker';
import StyledTextInput from '../components/shared/StyledTextInput';
import RecurringForm from '../components/recurring/RecurringForm';
import {
    createRecurringTransactionInSupabase,
    deleteRecurringTransactionInSupabase,
    getRecurringTransactionByTransactionId,
    updateRecurringTransactionInSupabase
} from '../supabase';
import CategoryBottomSheet from '../components/CategoryBottomSheet';

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
    'cash_in_out': { credit: 'cash_in', debit: 'cash_out' },
    'debit_credit': { credit: 'credit', debit: 'debit' },
    'receive_send': { credit: 'receive', debit: 'send_out' },
    'borrow_lend': { credit: 'borrow', debit: 'lend' },
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
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringPattern, setRecurringPattern] = useState(null);
    const [recurringTransaction, setRecurringTransaction] = useState(null);
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [parentTransactionId, setParentTransactionId] = useState(null);
    const [categoryId, setCategoryId] = useState(null);
    const [categoryMap, setCategoryMap] = useState({});
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(hp(50))).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    // Keep track of accountType for useEffect dependencies
    const [accountType, setAccountType] = useState('');

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = state.isConnected && state.isInternetReachable;
            setIsOnline(online);
        });

        return () => {
            unsubscribe();
        };
    }, []);

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
        setAccountType(accountType);
        
        const relevantTypeValues = transactionTypeMapping[accountType] ? Object.values(transactionTypeMapping[accountType]) : [];
        const filteredTypes = allTransactionTypes.filter(t => relevantTypeValues.includes(t.value));

        setAvailableTypes(filteredTypes.length > 0 ? filteredTypes : allTransactionTypes);

        // Only set default type for NEW transactions
        if (!transactionId) {
            setType(filteredTypes[0]?.value || allTransactionTypes[0]?.value || '');
        }
    }, [accountId, transactionId, accountType]);

    useEffect(() => {
        const realmCategories = realm.objects('Category').filtered('isActive == true');
        const catMap = realmCategories.reduce((map, cat) => {
            map[cat.id] = cat;
            return map;
        }, {});
        setCategoryMap(catMap);

        if (route.params?.selectedCategoryId) {
            setCategoryId(route.params.selectedCategoryId);
        }
    }, [route.params?.selectedCategoryId]);

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
            if (!transaction) return;

            // Store original for potential revert on balance update
            setOriginalTransaction(transaction.toJSON());
            setCategoryId(transaction.categoryId);
            
            // Get the account type to convert the transaction type correctly
            const account = realm.objectForPrimaryKey('Account', accountId);
            if (account) {
                setAccountType(account.type);
            }
            
            // Convert the generic storage type (credit/debit) to UI-specific type
            const uiType = getUiTypeFromStorageType(transaction.type, account?.type);

            if (isDuplicating) {
                // If duplicating, load data but don't set isEditing to true.
                // Reset date to current and clear ID-specific fields.
                setType(uiType);
                setTransactionDate(new Date());
                setPurpose(transaction.purpose);
                setAmount(String(transaction.amount));
                setCurrency(transaction.currency);
                setRemarks(transaction.remarks);
                setImageUri(transaction.photoUrl);
                setContactPerson(transaction.contactId);
                setIsProxyPayment(transaction.is_proxy_payment);
                setOnBehalfOfContactId(transaction.on_behalf_of_contact_id);
                setParentTransactionId(transaction.parentTransactionId);

                // Fetch contact names if IDs exist
                if (transaction.contactId) {
                    const contact = realm.objectForPrimaryKey('Contact', transaction.contactId);
                    if (contact) setContactName(contact.name);
                }
                if (transaction.on_behalf_of_contact_id) {
                    const onBehalfContact = realm.objectForPrimaryKey('Contact', transaction.on_behalf_of_contact_id);
                    if (onBehalfContact) setOnBehalfOfContactName(onBehalfContact.name);
                }
            } else {
                // If editing, load all data as is.
                setType(uiType);
                setTransactionDate(new Date(transaction.transactionDate));
                setPurpose(transaction.purpose);
                setAmount(String(transaction.amount));
                setCurrency(transaction.currency);
                setRemarks(transaction.remarks);
                setImageUri(transaction.photoUrl);
                setContactPerson(transaction.contactId);
                setIsProxyPayment(transaction.is_proxy_payment);
                setOnBehalfOfContactId(transaction.on_behalf_of_contact_id);
                setIsRecurring(transaction.isRecurring);

                let parsedPattern = null;
                if (transaction.recurringPattern && typeof transaction.recurringPattern === 'string') {
                    try {
                        parsedPattern = JSON.parse(transaction.recurringPattern);
                    } catch (e) {
                        console.error("Failed to parse recurringPattern JSON:", e);
                        parsedPattern = null; 
                    }
                }
                setRecurringPattern(parsedPattern);
                
                setParentTransactionId(transaction.parentTransactionId);

                // Fetch contact names if IDs exist
                if (transaction.contactId) {
                    const contact = realm.objectForPrimaryKey('Contact', transaction.contactId);
                    if (contact) setContactName(contact.name);
                }
                if (transaction.on_behalf_of_contact_id) {
                    const onBehalfContact = realm.objectForPrimaryKey('Contact', transaction.on_behalf_of_contact_id);
                    if (onBehalfContact) setOnBehalfOfContactName(onBehalfContact.name);
                }
            }

        } catch (error) {
            console.error('Failed to load transaction data:', error);
            safeAlert('Error', 'Failed to load transaction data.');
        }
    }, [transactionId, isDuplicating, accountId]);

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
            const user = realm.objects('User')[0];
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
        if (tx.isRecurring) return; // Do not update balance for recurring transactions
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

    const navigateToParent = () => {
        if (!parentTransactionId) return;
        navigation.push(screens.NewRecord, {
            transactionId: parentTransactionId,
            accountId: accountId,
            userId: userId,
            sourceScreen: sourceScreen,
        });
    };

    // Helper: convert empty string to null for UUID and enum fields before sending to Supabase
    function supabaseSafe(obj, nullFields = []) {
        const out = { ...obj };
        nullFields.forEach(field => {
            if (out[field] === '' || out[field] === undefined) out[field] = null;
        });
        return out;
    }

    const handleRecurringSubmit = (data) => {
        try {
            // Validate the data structure
            if (!data.frequency_type || !data.interval_value || !data.start_date) {
                throw new Error('Invalid recurring pattern data');
            }

            // Store the formatted data
            setRecurringPattern(data);
            setShowRecurringModal(false);
            Alert.alert("Recurring Rule Set", "The recurring transaction rule has been configured.");
        } catch (error) {
            console.error('Error setting recurring pattern:', error);
            Alert.alert("Error", "Failed to set recurring pattern. Please try again.");
        }
    };

    const handleCancelRecurring = () => {
        if (!isEditing || !isRecurring || !transactionId) return;
    
        Alert.alert(
            "Cancel Recurring Transaction",
            "Are you sure you want to cancel this recurring transaction? This will stop future transactions from being generated.",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        const user = realm.objects('User')[0];
                        const isPaidUser = user?.userType === 'paid';
    
                        const performLocalUpdate = () => {
                            realm.write(() => {
                                const tx = realm.objectForPrimaryKey('Transaction', transactionId);
                                if (tx) {
                                    tx.status = 'cancelled';
                                    tx.updatedOn = new Date();
                                }
                            });
                            Alert.alert("Success", "Recurring transaction has been cancelled.", [{ text: "OK", onPress: () => navigation.goBack() }]);
                        };
    
                        if (isPaidUser && isOnline) {
                            try {
                                await cancelRecurringTransactionInSupabase(transactionId);
                                performLocalUpdate();
                            } catch (error) {
                                console.error("Supabase cancel failed, creating SyncLog", error);
                                realm.write(() => {
                                    const tx = realm.objectForPrimaryKey('Transaction', transactionId);
                                    if (tx) {
                                        tx.status = 'cancelled';
                                        tx.needsUpload = true;
                                    }
                                });
                                performLocalUpdate();
                            }
                        } else {
                            realm.write(() => {
                                const tx = realm.objectForPrimaryKey('Transaction', transactionId);
                                if (tx) {
                                    tx.status = 'cancelled';
                                    tx.needsUpload = true;
                                }
                            });
                            performLocalUpdate();
                        }
                    },
                },
            ]
        );
    };

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

            const account = realm.objectForPrimaryKey('Account', accountId);
            if (!account) {
                throw new Error('Account not found');
            }
            // Map the UI type to the generic storage type for Realm/Supabase
            const storageType = mapUiTypeToStorageType(type);

            // Prepare transaction data
            const transactionData = {
                id: isEditing && transactionId ? transactionId : new Date().toISOString(),
                type: storageType, // Use the mapped storage type
                purpose: purpose || '',
                amount: parseFloat(amount) || 0,
                accountId: accountId || '',
                userId: userId || '',
                contactId: contactPerson || '',
                categoryId: categoryId || null,
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
                isRecurring: isRecurring,
                is_proxy_payment: showProxySwitch ? isProxyPayment : false,
                on_behalf_of_contact_id: showProxySwitch && isProxyPayment && onBehalfOfContactId ? onBehalfOfContactId : '',
                recurringPattern: isRecurring && recurringPattern ? JSON.stringify(recurringPattern) : '',
                parentTransactionId: parentTransactionId || null,
                isSettled: false,
                settledAt: null,
                settlementNote: '',
                createdOn: isEditing && originalTransaction ? originalTransaction.createdOn : new Date(),
                updatedOn: new Date(),
                syncStatus: 'pending',
                lastSyncAt: null,
                needsUpload: true
            };

            const user = realm.objects('User')[0];
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
                // Before doing anything, map the UI type to the generic storage type for the log
                const transactionForLog = { ...transactionData, type: mapUiTypeToStorageType(transactionData.type) };

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
                    const supabaseTxData = supabaseSafe(
                        { ...transactionData },
                        ['contactId', 'on_behalf_of_contact_id', 'parentTransactionId', 'recurringPattern', 'accountId', 'userId', 'remindToContactType', 'remindMeType']
                    );

                    if (isEditing) {
                        const supaTx = await updateTransactionInSupabase(transactionData.id, supabaseTxData);
                        
                        // Handle recurring logic on update
                        if (isRecurring && recurringPattern) {
                            const recurringData = recurringPattern;
                            if (recurringTransaction) { // Rule exists, so update it
                                await updateRecurringTransactionInSupabase(recurringTransaction.id, recurringData);
                            } else { // No rule existed, create a new one for this transaction
                                await createRecurringTransactionInSupabase(recurringData, supaTx.id, supabaseUserId);
                            }
                        } else if (recurringTransaction) { // isRecurring is false, so delete existing rule
                            await deleteRecurringTransactionInSupabase(recurringTransaction.id);
                        }
                        
                        finalTransactionId = supaTx.id;

                    } else { // Creating new transaction
                        const supaTx = await createTransactionInSupabase(supabaseTxData, supabaseUserId, {});
                        finalTransactionId = supaTx.id;

                        // Handle recurring logic on create
                        if (isRecurring && recurringPattern) {
                            const recurringData = recurringPattern;
                            await createRecurringTransactionInSupabase(recurringData, supaTx.id, supabaseUserId);
                        }
                    }

                    // Update local sync status in a separate write transaction
                    realm.write(() => {
                        const currentTxId = isEditing ? transactionId : transactionData.id;
                        const txToUpdate = realm.objectForPrimaryKey('Transaction', currentTxId);

                        if (txToUpdate) {
                            if (!isEditing && finalTransactionId !== transactionData.id) {
                                realm.delete(txToUpdate);
                                realm.create('Transaction', {
                                    ...transactionData, id: finalTransactionId, syncStatus: 'synced', needsUpload: false, lastSyncAt: new Date(),
                                }, Realm.UpdateMode.Modified);
                            } else {
                                txToUpdate.syncStatus = 'synced';
                                txToUpdate.needsUpload = false;
                                txToUpdate.lastSyncAt = new Date();
                            }
                            
                            const syncLog = realm.objects('SyncLog').filtered('recordId == $0 AND status == "pending"', currentTxId).sorted('createdOn', true)[0];
                            if (syncLog) {
                                syncLog.recordId = finalTransactionId;
                                syncLog.status = 'completed';
                                syncLog.processedAt = new Date();
                            }
                        }
                    });

                } catch (supabaseError) {
                    console.error('Supabase sync error:', supabaseError);
                }
            }

            // STEP 3: Trigger callback and show success alert
            Alert.alert(
                t('common.success'),
                t('addNewRecordScreen.alerts.success.save'),
                [{ text: t('common.ok'), onPress: () => navigation.goBack() }],
                { cancelable: false }
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
        route.params?.onTransactionSaved, route.params?.onSave, isDuplicating,
        isRecurring, recurringPattern, recurringTransaction, parentTransactionId, categoryId
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

    // Add this function to handle category selection
    const handleSelectCategory = (selectedCategoryId) => {
        setCategoryId(selectedCategoryId);
    };

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
                        {isEditing && parentTransactionId && (
                            <View style={styles.cardContainer}>
                                <Text style={styles.sectionTitle}>Recurring Info</Text>
                                <TouchableOpacity onPress={navigateToParent} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                    <Icon name="info-outline" size={20} color={colors.primary} style={{ marginRight: 8 }}/>
                                    <Text style={styles.linkText}>This is a child transaction. Tap to edit the series.</Text>
                                </TouchableOpacity>
                            </View>
                        )}

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
                            <TouchableOpacity onPress={() => setShowCategoryPicker(true)}>
                                <StyledTextInput
                                    label={t('newRecordScreen.categoryLabel', 'Category')}
                                    value={categoryId && categoryMap[categoryId] ? `${categoryMap[categoryId].icon} ${categoryMap[categoryId].name}`: ''}
                                    placeholder={t('newRecordScreen.selectCategoryPlaceholder', 'Select a category')}
                                    editable={false}
                                    iconName="chevron-down"
                                />
                            </TouchableOpacity>
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

                        {/* Recurring Transaction Section */}
                        <View style={styles.cardContainer}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View>
                                    <Text style={styles.sectionTitle}>Recurring Transaction</Text>
                                    {(userType !== 'paid' || !isOnline) &&
                                        <Text style={{ color: colors.error }}>{userType !== 'paid' ? "This is a premium feature." : "This feature is not available offline."}</Text>
                                    }
                                </View>
                                <Switch
                                    value={isRecurring}
                                    onValueChange={(value) => {
                                        setIsRecurring(value)
                                        if (!value) {
                                            setRecurringPattern(null);
                                        }
                                    }}
                                    disabled={userType !== 'paid' || !isOnline || isEditing}
                                />
                            </View>
                            {isRecurring && (
                                <TouchableOpacity
                                    style={{
                                        marginTop: 10,
                                        paddingVertical: 10,
                                        paddingHorizontal: 15,
                                        backgroundColor: colors.primary,
                                        borderRadius: 8,
                                        alignItems: 'center'
                                    }}
                                    onPress={() => setShowRecurringModal(true)}
                                >
                                    <Text style={{ color: colors.white, fontWeight: 'bold' }}>{recurringPattern ? "Edit Recurring Rule" : "Configure Recurring Rule"}</Text>
                                </TouchableOpacity>
                            )}
                            {isEditing && isRecurring && !parentTransactionId && (
                                <TouchableOpacity
                                    style={{
                                        marginTop: 10,
                                        paddingVertical: 10,
                                        paddingHorizontal: 15,
                                        backgroundColor: colors.error,
                                        borderRadius: 8,
                                        alignItems: 'center'
                                    }}
                                    onPress={handleCancelRecurring}
                                >
                                    <Text style={{ color: colors.white, fontWeight: 'bold' }}>Cancel Recurring Series</Text>
                                </TouchableOpacity>
                            )}
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
                        visible={showRecurringModal}
                        animationType="slide"
                        onRequestClose={() => setShowRecurringModal(false)}
                    >
                        <RecurringForm
                            onSubmit={handleRecurringSubmit}
                            onCancel={() => setShowRecurringModal(false)}
                            initialData={recurringPattern || {}}
                        />
                    </Modal>
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
                    <CategoryBottomSheet
                        visible={showCategoryPicker}
                        onClose={() => setShowCategoryPicker(false)}
                        onSelectCategory={handleSelectCategory}
                        forTransaction={true}
                        transactionType={type}
                    />
                </Animated.View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default NewRecordScreen;