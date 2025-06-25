import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
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
    Switch // Add this import for the Switch component
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

const getAvailableTransactionTypes = (accountType) => {
    console.log('ghjgjhgjh',accountType)
    switch (accountType) {
        case 'cash_in_out':
            return [
                { label: 'Cash In', value: 'cash_in' },
                { label: 'Cash Out', value: 'cash_out' }
            ];
        case 'receive_send':
            return [
                { label: 'Receive', value: 'receive' },
                { label: 'Send Out', value: 'send_out' }
            ];
        case 'borrow_lend':
            return [
                { label: 'Borrow', value: 'borrow' },
                { label: 'Lend', value: 'lend' }
            ];
        case 'debit_credit':
            return [
                { label: 'Debit', value: 'debit' },
                { label: 'Credit', value: 'credit' }
            ];
        default:
            return [
                { label: 'Cash In', value: 'cash_in' },
                { label: 'Cash Out', value: 'cash_out' }
            ];
    }
};

function mapTypeForSupabase(type) {
    if (['cash_in', 'receive', 'credit'].includes(type)) return 'credit';
    if (['cash_out', 'send_out', 'debit'].includes(type)) return 'debit';
    if (['borrow'].includes(type)) return 'borrow';
    if (['lend'].includes(type)) return 'lend';
    return type;
}

const NewRecordScreen = ({ navigation, route }) => {
    const { t } = useTranslation();
    const {
        transactionId,
        accountId,
        userId,
        sourceScreen // 'account' or 'calendar'
    } = route.params || {};
    const [type, setType] = useState('');
    const [availableTypes, setAvailableTypes] = useState([
        { label: 'Cash In', value: 'cash_in' },
        { label: 'Cash Out', value: 'cash_out' }
    ]);
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
            setIsEditing(true);
            loadTransactionData();
        }
    }, [transactionId]);

    // Re-compute available types if accountId changes, preserve type on edit
    useEffect(() => {
        if (!accountId) return;
        const account = realm.objectForPrimaryKey('Account', accountId);
        if (!account) return;
        setAccountType(account.type || '');

        const types = getAvailableTransactionTypes(account.type);
        setAvailableTypes(types);
        
        // Only update type if not in edit mode and type isn't already set
        if (!isEditing && !type) {
            setType(types[0]?.value || '');
        }
    }, [accountId, isEditing, type]);

    // Set type after availableTypes are set and transaction is loaded (edit mode)
    useEffect(() => {
        if (!isEditing || !originalTransaction) return;
        // Try to match transaction type to availableTypes, fallback to original
        let txType = originalTransaction.type;
        const found = availableTypes.find(t => t.value.toLowerCase() === txType.toLowerCase());
        if (found) setType(found.value);
        else setType(txType);
    }, [isEditing, availableTypes, originalTransaction]);

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
        try {
            const transaction = realm.objectForPrimaryKey('Transaction', transactionId);
            if (transaction) {
                setOriginalTransaction(transaction);
                setAmount(transaction.amount?.toString() || '');
                setTransactionDate(transaction.transactionDate || new Date());
                setRemarks(transaction.remarks || '');
                setPurpose(transaction.purpose || '');
                setImageUri(transaction.photoUrl || null);
                setContactPerson(transaction.contactId || '');
            }
        } catch (error) {
            console.error('Error loading transaction:', error);
            safeAlert('Error', 'Failed to load transaction data');
        }
    }, [transactionId]);

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

    // When editing, load proxy fields
    useEffect(() => {
        if (isEditing && originalTransaction) {
            setIsProxyPayment(originalTransaction.is_proxy_payment || false);
            setOnBehalfOfContactId(originalTransaction.on_behalf_of_contact_id || '');
            if (originalTransaction.on_behalf_of_contact_id) {
                const c = realm.objectForPrimaryKey('Contact', originalTransaction.on_behalf_of_contact_id);
                setOnBehalfOfContactName(c?.name || '');
            }
        }
    }, [isEditing, originalTransaction]);

    // Exclude selected contacts from each other's dropdowns
    const availableContactsForContact = contacts.filter(c => c.id !== onBehalfOfContactId);
    const availableContactsForOnBehalf = contacts.filter(c => c.id !== contactPerson);

    // Show proxy switch only for paid users and send-out/cash-out/lend/debit types
    const showProxySwitch = userType === 'paid' && (
        ['send_out', 'cash_out', 'lend', 'debit'].includes(type)
    );

    const handleSave = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            // Prepare transaction data
            const transactionData = {
                id: isEditing && transactionId ? transactionId : new Date().toISOString(),
                type: type,
                purpose: purpose || null,
                amount: parseFloat(amount) || 0,
                accountId: accountId,
                userId: userId,
                contactId: contactPerson || null,
                transactionDate: transactionDate,
                remarks: remarks || null,
                photoUrl: imageUri || null,
                remindToContact: false,
                remindMe: false,
                remindToContactType: null,
                remindMeType: null,
                remindContactAt: null,
                remindMeAt: null,
                status: 'completed',
                isRecurring: false,
                is_proxy_payment: showProxySwitch ? isProxyPayment : false,
                on_behalf_of_contact_id: showProxySwitch && isProxyPayment && onBehalfOfContactId ? onBehalfOfContactId : null,
                recurringPattern: null,
                parentTransactionId: null,
                isSettled: false,
                settledAt: null,
                settlementNote: null,
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

            if (isEditing) {
                if (paid && netOn) {
                    try {
                        // Map type for Supabase
                        const supabaseTxData = { ...transactionData, type: mapTypeForSupabase(transactionData.type) };
                        // Update in Supabase first
                        const supaTx = await updateTransactionInSupabase(transactionData.id, supabaseTxData);
                        // Update in Realm with Supabase response
                        realm.write(() => {
                            realm.create('Transaction', {
                                ...transactionData,
                                ...supaTx,
                                id: supaTx.id,
                                syncStatus: 'synced',
                                needsUpload: false,
                                lastSyncAt: new Date(),
                                createdOn: supaTx.created_on ? new Date(supaTx.created_on) : transactionData.createdOn,
                                updatedOn: supaTx.updated_on ? new Date(supaTx.updated_on) : new Date(),
                            }, 'modified');
                        });
                    } catch (e) {
                        // If Supabase fails, fallback to local + SyncLog
                        realm.write(() => {
                            realm.create('Transaction', transactionData, 'modified');
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
                        });
                    }
                } else {
                    // Offline or free: update in Realm and add SyncLog
                    realm.write(() => {
                        realm.create('Transaction', transactionData, 'modified');
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
                    });
                }
            } else {
                // --- CREATE LOGIC ---
                if (paid && netOn) {
                    try {
                        // Map type for Supabase
                        const supabaseTxData = { ...transactionData, type: mapTypeForSupabase(transactionData.type) };
                        const supaTx = await createTransactionInSupabase(supabaseTxData, supabaseUserId, {});
                        realm.write(() => {
                            realm.create('Transaction', {
                                ...transactionData,
                                id: supaTx.id,
                                syncStatus: 'synced',
                                needsUpload: false,
                                lastSyncAt: new Date(),
                                createdOn: supaTx.created_on ? new Date(supaTx.created_on) : new Date(),
                                updatedOn: supaTx.updated_on ? new Date(supaTx.updated_on) : new Date(),
                            }, 'modified');
                        });
                    } catch (e) {
                        realm.write(() => {
                            realm.create('Transaction', transactionData);
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
                        });
                    }
                } else {
                    realm.write(() => {
                        realm.create('Transaction', transactionData);
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
                    });
                }
            }

            Alert.alert(
                t('common.success'),
                t('addNewRecordScreen.alerts.success.save'),
                [
                    {
                        text: t('common.ok'),
                        onPress: () => navigation.goBack()
                    }
                ]
            );
            setIsLoading(false);
        } catch (error) {
            safeAlert('Error', 'Failed to save transaction: ' + error.message);
            setIsLoading(false);
        }
    }, [
        isLoading, amount, type, accountId, userId, transactionId, originalTransaction, isEditing,
        contactPerson, transactionDate, remarks, purpose, imageUri, navigation,
        isProxyPayment, onBehalfOfContactId, showProxySwitch, userType
    ]);

    const handleDelete = useCallback(async () => {
        if (isLoading || !isEditing || !originalTransaction) return;

        Alert.alert(
            t('addNewRecordScreen.alerts.success.confirmDeleteLabel'),
            t('addNewRecordScreen.alerts.success.confirmDeleteDescription'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            const user = realm.objectForPrimaryKey('User', userId);
                            const supabaseUserId = user?.supabaseId;
                            const netState = await NetInfo.fetch();
                            const netOn = netState.isConnected && netState.isInternetReachable;
                            const paid = user?.userType === 'paid';
                            const transactionIdToDelete = originalTransaction.id;

                            if (paid && netOn) {
                                // Delete from Supabase first
                                try {
                                    await deleteTransactionInSupabase(transactionIdToDelete);
                                } catch (e) {
                                    // Optionally show alert or ignore
                                    console.error('Supabase transaction delete error:', e);
                                }
                            }

                            // Delete from Realm (after Supabase, or always if offline/free)
                            realm.write(() => {
                                // ...existing code for updating account balances...
                                const account = realm.objectForPrimaryKey('Account', originalTransaction.accountId);
                                if (account) {
                                    const amount = parseFloat(originalTransaction.amount) || 0;
                                    let balanceChange = amount;
                                    if (['cash_out', 'send_out', 'lend', 'debit'].includes(originalTransaction.type)) {
                                        balanceChange = -balanceChange;
                                    }
                                    const updatedAccount = {
                                        ...account,
                                        currentBalance: (account.currentBalance || 0) - balanceChange,
                                        updatedOn: new Date()
                                    };
                                    if (originalTransaction.type === 'cash_in') updatedAccount.cash_in = (account.cash_in || 0) - amount;
                                    else if (originalTransaction.type === 'cash_out') updatedAccount.cash_out = (account.cash_out || 0) - amount;
                                    else if (originalTransaction.type === 'receive') updatedAccount.receive = (account.receive || 0) - amount;
                                    else if (originalTransaction.type === 'send_out') updatedAccount.send_out = (account.send_out || 0) - amount;
                                    else if (originalTransaction.type === 'borrow') updatedAccount.borrow = (account.borrow || 0) - amount;
                                    else if (originalTransaction.type === 'lend') updatedAccount.lend = (account.lend || 0) - amount;
                                    else if (originalTransaction.type === 'debit') updatedAccount.debit = (account.debit || 0) - amount;
                                    else if (originalTransaction.type === 'credit') updatedAccount.credit = (account.credit || 0) - amount;
                                    realm.create('Account', updatedAccount, 'modified');
                                }
                                realm.delete(originalTransaction);
                            });

                            // If offline or free, add SyncLog for delete
                            if (!paid || !netOn) {
                                realm.write(() => {
                                    realm.create('SyncLog', {
                                        id: Date.now().toString() + '_log',
                                        userId: userId,
                                        tableName: 'transactions',
                                        recordId: transactionIdToDelete,
                                        operation: 'delete',
                                        status: 'pending',
                                        createdOn: new Date(),
                                        processedAt: null
                                    });
                            });
                            }

                            safeAlert('Success', 'Transaction deleted successfully.');
                            navigation.goBack();
                        } catch (error) {
                            console.error('Failed to delete transaction:', error);
                            safeAlert('Error', 'Failed to delete transaction. Please try again.');
                        } finally {
                            setIsLoading(false);
                        }
                    },
                },
            ]
        );
    }, [isLoading, isEditing, originalTransaction, navigation, userId]);

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
                            {isEditing ? t('newRecordScreen.editTitle') : t('newRecordScreen.title')}
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
                                        <Text style={styles.sectionTitle}>{t('newRecordScreen.onBehalfOfContact')}</Text>
                                        <TouchableOpacity
                                            style={[styles.dropdownInput, onBehalfOfContactId && styles.inputFocused]}
                                            onPress={() => setShowOnBehalfDropdown(!showOnBehalfDropdown)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.inputText, !onBehalfOfContactName && styles.placeholderText]}>
                                                {onBehalfOfContactName || t('newRecordScreen.selectContactPlaceholder')}
                                            </Text>
                                            <Icon
                                                name={showOnBehalfDropdown ? 'expand-less' : 'expand-more'}
                                                size={24}
                                                color={colors.gray}
                                            />
                                        </TouchableOpacity>
                                        {showOnBehalfDropdown && (
                                            <View style={styles.dropdownMenu}>
                                                <ScrollView style={styles.dropdownScroll}>
                                                    {availableContactsForOnBehalf.map(contact => (
                                                        <TouchableOpacity
                                                            key={contact.id}
                                                            style={styles.dropdownItem}
                                                            onPress={() => handleSelectOnBehalfContact(contact)}
                                                        >
                                                            <Text style={styles.dropdownItemText}>{contact.name}</Text>
                                                            {onBehalfOfContactId === contact.id && (
                                                                <Icon name="check" size={20} color={colors.primary} />
                                                            )}
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
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
                            <Text style={styles.sectionTitle}>{t('newRecordScreen.contactLabel')}</Text>
                            <TouchableOpacity
                                style={[styles.dropdownInput, contactPerson && styles.inputFocused]}
                                onPress={handleContactPress}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.inputText, !contactName && styles.placeholderText]}>
                                    {contactName || t('newRecordScreen.selectContactPlaceholder')}
                                </Text>
                                <Icon
                                    name={showContactDropdown ? 'expand-less' : 'expand-more'}
                                    size={24}
                                    color={colors.gray}
                                />
                            </TouchableOpacity>

                            {/* Contact dropdown */}
                            {showContactDropdown && (
                                <View style={styles.dropdownMenu}>
                                    <ScrollView style={styles.dropdownScroll}>
                                        {availableContactsForContact.map(contact => (
                                            <TouchableOpacity
                                                key={contact.id}
                                                style={styles.dropdownItem}
                                                onPress={() => handleSelectContact(contact)}
                                            >
                                                <Text style={styles.dropdownItemText}>{contact.name}</Text>
                                                {contactPerson === contact.id && (
                                                    <Icon name="check" size={20} color={colors.primary} />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                    <TouchableOpacity
                                        style={styles.addContactBtn}
                                        onPress={() => {
                                            setShowContactDropdown(false);
                                            setShowContactOptionsModal(true);
                                        }}
                                    >
                                        <Icon name="add" size={20} color={colors.primary} />
                                        <Text style={styles.addContactBtnText}>{t('addNewContact')}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        <View style={styles.cardContainer}>
                            <Text style={styles.sectionTitle}>{t('newRecordScreen.purposeLabel')}</Text>
                            <TouchableOpacity 
                                style={styles.selectInput}
                                onPress={() => setShowPurposeModal(true)}
                            >
                                <Text style={purpose ? styles.selectInputText : styles.selectInputPlaceholder}>
                                    {purpose || t('newRecordScreen.selectPurpose')}
                                </Text>
                                <Icon name="arrow-drop-down" size={24} color={colors.gray} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.cardContainer}>
                            <Text style={styles.sectionTitle}>{t('newRecordScreen.amountLabel')}</Text>
                            <View style={styles.amountContainer}>
                                <View style={[styles.inputWrapper, styles.amountInputWrapper, isAmountFocused && styles.inputWrapperFocused]}>
                                    <Icon name="attach-money" size={RFValue(20)} color={colors.primary} />
                                    <TextInput
                                        style={[styles.input, styles.amountInput]}
                                        keyboardType="numeric"
                                        placeholder={t('newRecordScreen.amountPlaceholder')}
                                        placeholderTextColor={colors.textSecondary}
                                        value={amount}
                                        onChangeText={setAmount}
                                        onFocus={() => setIsAmountFocused(true)}
                                        onBlur={() => setIsAmountFocused(false)}
                                        editable={!isLoading}
                                    />
                                </View>
                                <LinearGradient
                                    colors={[colors.primary, colors.primaryDark]}
                                    style={styles.currencyButton}
                                >
                                    <Text style={styles.currencyText}>{currency}</Text>
                                </LinearGradient>
                            </View>
                        </View>

                        <View style={styles.cardContainer}>
                            <Text style={styles.sectionTitle}>{t('newRecordScreen.remarksLabel')}</Text>
                            <View style={[styles.inputWrapper, styles.remarkWrapper, isRemarksFocused && styles.inputWrapperFocused]}>
                                <Icon name="note" size={RFValue(20)} color={colors.primary} style={styles.remarkIcon} />
                                <TextInput
                                    style={[styles.input, styles.remarkInput]}
                                    placeholder={t('newRecordScreen.remarksPlaceholder')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={remarks}
                                    onChangeText={setRemarks}
                                    onFocus={() => setIsRemarksFocused(true)}
                                    onBlur={() => setIsRemarksFocused(false)}
                                    multiline
                                    textAlignVertical="top"
                                    editable={!isLoading}
                                />
                            </View>
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
                                    disabled={isLoading}
                                >
                                    <Text style={[styles.buttonText, { color: colors.textSecondary }]}>{t('newRecordScreen.cancelButton')}</Text>
                                </TouchableOpacity>
                                {isEditing && (
                                    <TouchableOpacity
                                        style={[styles.floatingButton, styles.deleteButton]}
                                        onPress={handleDelete}
                                        activeOpacity={0.8}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color={colors.error} size="small" />
                                        ) : (
                                            <Text style={[styles.buttonText, { color: colors.error }]}>{t('newRecordScreen.deleteButton')}</Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.floatingButton, styles.saveButton]}
                                    onPress={handleSave}
                                    activeOpacity={0.8}
                                    disabled={isLoading}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, colors.primaryDark]}
                                        style={styles.saveButtonGradient}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color={colors.white} size="small" />
                                        ) : (
                                            <Text style={[styles.buttonText, { color: colors.white }]}>
                                                {isEditing ? t('newRecordScreen.updateButton') : t('newRecordScreen.saveButton')}
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
                        <TouchableOpacity 
                            style={styles.modalBackdrop}
                            activeOpacity={1}
                            onPress={() => setShowPurposeModal(false)}
                        >
                            <TouchableWithoutFeedback>
                                <View style={styles.modalContent}>
                                    <Text style={styles.modalTitle}>{t('newRecordScreen.selectPurpose')}</Text>
                                    <FlatList
                                        data={purposes}
                                        keyExtractor={item => item.id}
                                        renderItem={({item}) => (
                                            <TouchableOpacity 
                                                style={styles.modalItem}
                                                onPress={() => {
                                                    setPurpose(item.element);
                                                    setShowPurposeModal(false);
                                                }}
                                            >
                                                <Text>{item.description}</Text>
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
                            </TouchableWithoutFeedback>
                        </TouchableOpacity>
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
                                <TextInput
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