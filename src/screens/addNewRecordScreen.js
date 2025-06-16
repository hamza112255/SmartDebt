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
const { width, height } = Dimensions.get('window');

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
    switch (accountType) {
        case 'Cash In - Cash Out':
            return [
                { label: 'Cash In', value: 'cashIn' },
                { label: 'Cash Out', value: 'cashOut' }
            ];
        case 'Receive - Send Out':
            return [
                { label: 'Receive', value: 'receive' },
                { label: 'Send Out', value: 'sendOut' }
            ];
        case 'Borrow - Lend':
            return [
                { label: 'Borrow', value: 'borrow' },
                { label: 'Lend', value: 'lend' }
            ];
        case 'Debit - Credit':
            return [
                { label: 'Debit', value: 'debit' },
                { label: 'Credit', value: 'credit' }
            ];
        default:
            return [
                { label: 'Cash In', value: 'cashIn' },
                { label: 'Cash Out', value: 'cashOut' }
            ];
    }
};

const NewRecordScreen = ({ navigation, route }) => {
    const {
        transactionId,
        accountId,
        userId,
        onSave,
        sourceScreen // 'account' or 'calendar'
    } = route.params || {};
    const [type, setType] = useState('');
    const [availableTypes, setAvailableTypes] = useState([
        { label: 'Cash In', value: 'cashIn' },
        { label: 'Cash Out', value: 'cashOut' }
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

        // If this is not editing, set default type
        if (!isEditing) {
            setType(types[0]?.value);
        }
    }, [accountId, isEditing]);

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

    const handleSave = useCallback(async () => {
        if (isLoading) return;
        if (!contactPerson) {
            safeAlert('Error', 'Please select a contact person.');
            return;
        }
        if (!purpose) {
            safeAlert('Error', 'Please enter a purpose.');
            return;
        }
        if (!amount || isNaN(parseFloat(amount))) {
            safeAlert('Error', 'Please enter a valid amount.');
            return;
        }
        setIsLoading(true);
        try {
            realm.write(() => {
                const transactionAmount = parseFloat(amount) || 0;
                const account = realm.objectForPrimaryKey('Account', accountId);

                if (account) {
                    let balanceChange = 0;
                    let typeChange = 0;

                    if (isEditing && originalTransaction) {
                        const originalAmount = parseFloat(originalTransaction.amount) || 0;
                        if (Math.abs(transactionAmount - originalAmount) > 0.01) {
                            balanceChange = transactionAmount - originalAmount;
                            if (['cashIn', 'receive', 'borrow', 'credit'].includes(originalTransaction.type)) {
                                typeChange = transactionAmount - originalAmount;
                            } else {
                                typeChange = originalAmount - transactionAmount;
                            }
                            if (['cashOut', 'sendOut', 'lend', 'debit'].includes(originalTransaction.type)) {
                                balanceChange = -balanceChange;
                            }
                        }
                    } else {
                        balanceChange = transactionAmount;
                        typeChange = transactionAmount;
                        if (['cashOut', 'sendOut', 'lend', 'debit'].includes(type)) {
                            balanceChange = -balanceChange;
                            typeChange = -typeChange;
                        }
                    }

                    if (balanceChange !== 0) {
                        const updatedAccount = {
                            ...account,
                            currentBalance: (account.currentBalance || 0) + balanceChange,
                            updatedOn: new Date()
                        };
                        if (type === 'cashIn') updatedAccount.cashIn = (account.cashIn || 0) + typeChange;
                        else if (type === 'cashOut') updatedAccount.cashOut = (account.cashOut || 0) - typeChange;
                        else if (type === 'receive') updatedAccount.receive = (account.receive || 0) + typeChange;
                        else if (type === 'sendOut') updatedAccount.sendOut = (account.sendOut || 0) - typeChange;
                        else if (type === 'borrow') updatedAccount.borrow = (account.borrow || 0) + typeChange;
                        else if (type === 'lend') updatedAccount.lend = (account.lend || 0) - typeChange;
                        else if (type === 'debit') updatedAccount.debit = (account.debit || 0) - typeChange;
                        else if (type === 'credit') updatedAccount.credit = (account.credit || 0) + typeChange;

                        realm.create('Account', updatedAccount, 'modified');
                    }
                }

                const transactionData = {
                    id: isEditing && transactionId ? transactionId : new Realm.BSON.UUID().toString(),
                    type: type,
                    amount: transactionAmount,
                    transactionDate: transactionDate,
                    remarks: remarks || '',
                    purpose: purpose || '',
                    accountId: accountId,
                    userId: userId,
                    contactId: contactPerson || '',
                    photoUrl: imageUri || '',
                    remindToContact: false,
                    remindMe: false,
                    remindToContactType: '',
                    remindMeType: '',
                    remindContactAt: null,
                    remindMeAt: null,
                    status: 'completed',
                    isRecurring: false,
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

                if (isEditing && originalTransaction) {
                    realm.create('Transaction', transactionData, 'modified');
                } else {
                    realm.create('Transaction', transactionData);
                }

                safeAlert('Success', `Transaction saved. New balance: ${account.currentBalance.toFixed(2)}`);
            });

            onSave?.();
            if (sourceScreen === 'account') {
                navigation.navigate(screens.AccountDetails, { accountId });
            } else if (sourceScreen === 'calendar') {
                navigation.goBack();
            }
        } catch (error) {
            safeAlert('Error', 'Failed to save transaction: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, amount, type, accountId, userId, transactionId, originalTransaction, isEditing, contactPerson, transactionDate, remarks, purpose, imageUri, onSave, navigation, sourceScreen]);

    const handleDelete = useCallback(async () => {
        if (isLoading || !isEditing || !originalTransaction) return;

        Alert.alert(
            'Confirm Deletion',
            'Are you sure you want to delete this transaction? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            realm.write(() => {
                                const account = realm.objectForPrimaryKey('Account', originalTransaction.accountId);

                                if (account) {
                                    const amount = parseFloat(originalTransaction.amount) || 0;
                                    let balanceChange = amount;

                                    if (['cashOut', 'sendOut', 'lend', 'debit'].includes(originalTransaction.type)) {
                                        balanceChange = -balanceChange;
                                    }

                                    const updatedAccount = {
                                        ...account,
                                        currentBalance: (account.currentBalance || 0) - balanceChange,
                                        updatedOn: new Date()
                                    };

                                    if (originalTransaction.type === 'cashIn') updatedAccount.cashIn = (account.cashIn || 0) - amount;
                                    else if (originalTransaction.type === 'cashOut') updatedAccount.cashOut = (account.cashOut || 0) - amount;
                                    else if (originalTransaction.type === 'receive') updatedAccount.receive = (account.receive || 0) - amount;
                                    else if (originalTransaction.type === 'sendOut') updatedAccount.sendOut = (account.sendOut || 0) - amount;
                                    else if (originalTransaction.type === 'borrow') updatedAccount.borrow = (account.borrow || 0) - amount;
                                    else if (originalTransaction.type === 'lend') updatedAccount.lend = (account.lend || 0) - amount;
                                    else if (originalTransaction.type === 'debit') updatedAccount.debit = (account.debit || 0) - amount;
                                    else if (originalTransaction.type === 'credit') updatedAccount.credit = (account.credit || 0) - amount;

                                    realm.create('Account', updatedAccount, 'modified');
                                }

                                realm.delete(originalTransaction);
                            });

                            safeAlert('Success', 'Transaction deleted successfully.');
                            onSave?.();
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
    }, [isLoading, isEditing, originalTransaction, onSave, navigation]);

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
                        const id = new Realm.BSON.UUID().toString();
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

    // Saved Contacts Modal
    const SavedContactsModal = () => (
        <Modal
            visible={showContactModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowContactModal(false)}
        >
            <TouchableWithoutFeedback onPress={() => setShowContactModal(false)}>
                <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.sectionTitle}>Select Contact</Text>
                    {contacts.length === 0 ? (
                        <Text style={styles.noContactsText}>No contacts available</Text>
                    ) : (
                        <ScrollView>
                            {contacts.map(contact => (
                                <TouchableOpacity
                                    key={contact.id}
                                    style={styles.contactItem}
                                    onPress={() => handleSelectContact(contact)}
                                >
                                    <Text style={styles.contactName}>{contact.name}</Text>
                                    {contactPerson === contact.id && (
                                        <Icon name="check" size={24} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                    <TouchableOpacity
                        style={styles.addContactButton}
                        onPress={handleAddNewContact}
                    >
                        <Text style={styles.addContactText}>Add New Contact</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Contact Options Bottom Sheet
    const ContactOptionsBottomSheet = () => (
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
                    <Text style={styles.sectionTitle}>Add Contact</Text>
                    <TouchableOpacity
                        style={styles.bottomSheetOption}
                        onPress={() => handleContactOptionSelect('create')}
                    >
                        <Icon name="person-add" size={RFValue(20)} color={colors.primary} />
                        <Text style={styles.bottomSheetText}>Create New Contact</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.bottomSheetOption}
                        onPress={() => handleContactOptionSelect('import')}
                    >
                        <Text style={styles.bottomSheetText}>Import from Device</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

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
                    <Text style={styles.bottomSheetTitle}>Add Contact</Text>
                    
                    <TouchableOpacity 
                        style={styles.bottomSheetOption}
                        onPress={() => handleContactOptionSelect('create')}
                    >
                        <Text style={styles.bottomSheetText}>Create New Contact</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.bottomSheetOption}
                        onPress={() => handleContactOptionSelect('import')}
                    >
                        <Text style={styles.bottomSheetText}>Import from Device</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.bottomSheetCancel}
                        onPress={() => setShowContactOptionsModal(false)}
                    >
                        <Text style={styles.bottomSheetCancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const safeAlert = (title, message) => {
        if (!navigation.isFocused()) return;
        Alert.alert(title, message);
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
                            {isEditing ? 'Edit Transaction' : 'New Transaction'}
                        </Text>
                        <View style={styles.placeholder} />
                    </LinearGradient>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.cardContainer}>
                            <Text style={styles.sectionTitle}>Transaction Type</Text>
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
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.cardContainer}>
                            <Text style={styles.sectionTitle}>Date & Time</Text>
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

                        <View style={styles.cardContainer}>
                            <Text style={styles.sectionTitle}>
                                Contact Person <Text style={styles.required}>*</Text>
                            </Text>
                            <TouchableOpacity 
                                style={[styles.dropdownInput, contactPerson && styles.inputFocused]}
                                onPress={handleContactPress}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.inputText, !contactName && styles.placeholderText]}>
                                    {contactName || 'Select Contact'}
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
                                        {contacts.map(contact => (
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
                                        <Text style={styles.addContactBtnText}>Add New Contact</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        <View style={styles.cardContainer}>
                            <Text style={styles.sectionTitle}>
                                Purpose <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={[styles.inputWrapper, isPurposeFocused && styles.inputWrapperFocused]}>
                                <Icon name="description" size={RFValue(20)} color={colors.primary} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="What's this transaction for?"
                                    placeholderTextColor={colors.textSecondary}
                                    value={purpose}
                                    onChangeText={setPurpose}
                                    onFocus={() => setIsPurposeFocused(true)}
                                    onBlur={() => setIsPurposeFocused(false)}
                                    editable={!isLoading}
                                />
                            </View>
                        </View>

                        <View style={styles.cardContainer}>
                            <Text style={styles.sectionTitle}>
                                Amount <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={styles.amountContainer}>
                                <View style={[styles.inputWrapper, styles.amountInputWrapper, isAmountFocused && styles.inputWrapperFocused]}>
                                    <Icon name="attach-money" size={RFValue(20)} color={colors.primary} />
                                    <TextInput
                                        style={[styles.input, styles.amountInput]}
                                        keyboardType="numeric"
                                        placeholder="0.00"
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
                            <Text style={styles.sectionTitle}>Remarks</Text>
                            <View style={[styles.inputWrapper, styles.remarkWrapper, isRemarksFocused && styles.inputWrapperFocused]}>
                                <Icon name="note" size={RFValue(20)} color={colors.primary} style={styles.remarkIcon} />
                                <TextInput
                                    style={[styles.input, styles.remarkInput]}
                                    placeholder="Add additional notes (optional)"
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
                            <Text style={styles.sectionTitle}>Attachments</Text>
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
                                            <Text style={styles.attachmentText}>Add Photo</Text>
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
                                    onPress={() => navigation.goBack()}
                                    activeOpacity={0.8}
                                    disabled={isLoading}
                                >
                                    <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancel</Text>
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
                                            <Text style={[styles.buttonText, { color: colors.error }]}>Delete</Text>
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
                                                {isEditing ? 'Update' : 'Save'}
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
                            <Text style={styles.bottomSheetTitle}>Add Contact</Text>
                            <TouchableOpacity
                                style={styles.bottomSheetOption}
                                onPress={() => {
                                    navigation.navigate(screens.NewContact);
                                    setShowModal(false);
                                }}
                                activeOpacity={0.8}
                            >
                                <Icon name="person-add" size={RFValue(20)} color={colors.primary} />
                                <Text style={styles.bottomSheetText}>Create New Contact</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.bottomSheetOption}
                                onPress={importFromDeviceContacts}
                                activeOpacity={0.8}
                            >
                                <Icon name="contacts" size={RFValue(20)} color={colors.primary} />
                                <Text style={styles.bottomSheetText}>Import from Contacts</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </Modal>
                    <ContactOptionsModal />
                </Animated.View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(2),
        paddingHorizontal: wp(4),
        elevation: 8,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    backButton: {
        width: wp(10),
        height: wp(10),
        borderRadius: wp(5),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: RFPercentage(2.6),
        fontFamily: 'Sora-Bold',
        color: colors.white,
        flex: 1,
        textAlign: 'center',
        marginLeft: -wp(10),
    },
    placeholder: {
        width: wp(10),
    },
    scrollContent: {
        paddingTop: hp(2),
        paddingBottom: hp(12),
        paddingHorizontal: wp(4),
    },
    cardContainer: {
        backgroundColor: colors.white,
        borderRadius: wp(4),
        padding: wp(4),
        marginBottom: hp(2),
        elevation: 4,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    sectionTitle: {
        fontSize: RFPercentage(2.2),
        fontFamily: 'Sora-SemiBold',
        color: colors.textPrimary,
        marginBottom: hp(1.5),
    },
    required: {
        color: colors.error,
    },
    typeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: hp(1.5),
    },
    typeButton: {
        flex: 1,
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(3),
        borderRadius: wp(3),
        backgroundColor: colors.lightGray,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: wp(2),
    },
    typeButtonActive: {
        backgroundColor: 'transparent',
    },
    typeButtonText: {
        fontSize: RFPercentage(2),
        fontFamily: 'Sora-Medium',
        color: colors.textSecondary,
    },
    typeButtonTextActive: {
        color: colors.primary,
        fontFamily: 'Sora-Bold'
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: hp(1), // ~8px
        gap: wp(3), // ~12px
    },
    inputContainer: {
        flex: 1,
        marginBottom: hp(2.25), // ~18px
    },
    label: {
        fontSize: RFPercentage(2), // ~14px
        fontFamily: 'Sora-SemiBold',
        color: colors.gray,
        marginBottom: hp(0.75), // ~6px
    },
    required: {
        color: colors.error,
        fontSize: RFPercentage(2), // ~14px
    },
    dateTimeInput: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.5), // ~12px
        paddingHorizontal: wp(3.5), // ~14px
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: hp(0.125) }, // ~1px
    },
    inputFocused: {
        borderColor: colors.activeBorder,
        borderWidth: 2,
        elevation: 3,
        shadowOpacity: 0.15,
    },
    inputIcon: {
        marginRight: wp(2.5), // ~10px
    },
    dateTimeText: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        color: colors.textPrimary,
    },
    dropdownInput: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(4), // ~16px
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    dropdownText: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        color: colors.gray,
        flex: 1,
    },
    dropdownMenu: {
        maxHeight: 200,
        backgroundColor: colors.white,
        borderRadius: 8,
        marginTop: 4,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    dropdownItem: {
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dropdownItemText: {
        fontSize: 16,
        color: colors.textPrimary,
    },
    addMoreContactButton: {
        marginTop: hp(1), // ~8px
        paddingVertical: hp(1.25), // ~10px
        paddingHorizontal: wp(4), // ~16px
        borderWidth: 1,
        borderColor: colors.gray,
        borderRadius: wp(2.5), // ~10px
        borderStyle: 'dashed',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    addMoreText: {
        fontSize: RFPercentage(2), // ~14px
        fontFamily: 'Sora-Regular',
        color: colors.gray,
        fontWeight: '600',
    },
    input: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(4), // ~16px
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: hp(0.5), // ~4px
    },
    amountInput: {
        flex: 1,
        fontSize: RFPercentage(2.5), // ~18px
        marginRight: wp(2), // ~8px
    },
    currencyButton: {
        backgroundColor: colors.primary,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(4), // ~16px
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
    },
    currencyText: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Bold',
        color: colors.white,
        marginRight: wp(2), // ~8px
    },
    remarkInput: {
        height: hp(12.5), // ~100px
        textAlignVertical: 'top',
        marginTop: hp(1), // ~8px
    },
    attachmentButton: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        width: wp(17.5), // ~70px
        height: wp(17.5),
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        marginTop: hp(1), // ~8px
    },
    floatingButtonsWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'box-none',
        alignItems: 'center',
    },
    floatingButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: wp(3), // ~12px
        width: '100%',
        maxWidth: wp(90), // ~360px on a 400px width screen
        marginHorizontal: 'auto',
        paddingHorizontal: wp(4.5), // ~18px
        paddingBottom: Platform.OS === 'ios' ? hp(3.5) : hp(2), // ~28px or ~16px
        paddingTop: 0,
        backgroundColor: 'transparent',
    },
    floatingButton: {
        flex: 1,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: wp(1.5), // ~6px
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderWidth: 0,
        marginLeft: wp(1.5), // ~6px
    },
    deleteButton: {
        backgroundColor: 'transparent',
        borderColor: colors.error,
        marginRight: wp(1.5),
    },
    buttonText: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Bold',
        color: colors.white,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalButtonText: {
        marginLeft: 12,
        fontSize: 16,
    },
    cancelButton: {
        padding: 14,
        marginTop: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: colors.error,
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    bottomSheetContainer: {
        justifyContent: 'flex-end',
    },
    bottomSheetContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 16,
    },
    bottomSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: colors.gray,
        borderRadius: 2,
        alignSelf: 'center',
        marginVertical: 8,
    },
    bottomSheetTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 8,
    },
    bottomSheetOption: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    bottomSheetText: {
        fontSize: 16,
        textAlign: 'center',
    },
    bottomSheetCancel: {
        padding: 16,
        marginTop: 8,
    },
    bottomSheetCancelText: {
        fontSize: 16,
        color: colors.error,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    imageContainer: {
        width: wp(17.5),
        height: wp(17.5),
        borderRadius: wp(3),
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    removeImageButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: colors.error,
        padding: wp(1),
        borderRadius: wp(2),
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    addContactBtn: {
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
    contactItem: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    addContactButton: {
        padding: 16,
        backgroundColor: colors.primary,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    addContactText: {
        color: colors.white,
        fontWeight: 'bold',
    },
    bottomSheetContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 32,
    },
    bottomSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: colors.gray,
        borderRadius: 2,
        alignSelf: 'center',
        marginVertical: 8,
    },
    bottomSheetOption: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalOptionText: {
        flex: 1,
        marginLeft: 16,
        fontSize: 16,
        color: colors.textPrimary,
    },
    dropdownScroll: {
        maxHeight: 150,
    },
    addContactBtnText: {
        marginLeft: 8,
        color: colors.primary,
        fontWeight: '500',
    }
});

export default NewRecordScreen;