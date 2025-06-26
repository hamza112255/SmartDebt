import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    ScrollView,
    Modal,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { createObject, updateObject, getAllObjects } from '../realm';
import uuid from 'react-native-uuid';
import { useTranslation } from 'react-i18next';
import NetInfo from '@react-native-community/netinfo';
import { createAccountInSupabase, updateAccountInSupabase, deleteAccountInSupabase } from '../supabase';

const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    error: '#dc2626',
    background: '#f8fafc',
    white: '#ffffff',
    gray: '#6b7280',
    lightGray: '#e0e0e0',
    border: '#e5e7eb',
    text: '#1e293b',
};

const AccountNameInput = memo(({ accountName, setAccountName, t }) => {
    const textInputRef = useRef(null);

    const handleTextChange = useCallback((text) => {
        setAccountName(text);
    }, [setAccountName]);

    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>
                {t('addNewAccountScreen.accountName')} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
                ref={textInputRef}
                style={styles.input}
                value={accountName}
                onChangeText={handleTextChange}
                placeholder={t('addNewAccountScreen.placeholders.accountName')}
                placeholderTextColor={colors.gray}
                autoFocus={false}
                returnKeyType="default"
                blurOnSubmit={false}
                autoCapitalize="words"
                autoCorrect={false}
                keyboardType="default"
            />
        </View>
    );
});

const AddAccountScreen = ({ navigation, route }) => {
    const { t, i18n } = useTranslation();
    const [accountName, setAccountName] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [terms, setTerms] = useState('cash_in_out');
    const [showCurrencySheet, setShowCurrencySheet] = useState(false);
    const [showTermsSheet, setShowTermsSheet] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userType, setUserType] = useState('free');
    const [supabaseUserId, setSupabaseUserId] = useState(null);
    const [initialAmount, setInitialAmount] = useState('');

    useEffect(() => {
        // Fetch currencies from Realm
        const currencyElements = getAllObjects('CodeListElement')
            .filtered('codeListName == "currencies" && active == true')
            .sorted('sortOrder');
        
        setCurrencies(Array.from(currencyElements));
        
        // Realm change listener
        const listener = () => {
            const updatedCurrencies = getAllObjects('CodeListElement')
                .filtered('codeListName == "currencies" && active == true')
                .sorted('sortOrder');
            setCurrencies(Array.from(updatedCurrencies));
        };
        
        currencyElements.addListener(listener);
        return () => currencyElements.removeListener(listener);
    }, []);

    const existingAccount = route?.params?.account ?? null;

    useEffect(() => {
        if (existingAccount) {
            setAccountName(existingAccount.name);
            setCurrency(existingAccount.currency || 'USD');
            setTerms(existingAccount.type);
            setInitialAmount(
                typeof existingAccount.initial_amount === 'number'
                    ? existingAccount.initial_amount.toString()
                    : (existingAccount.initial_amount || '').toString()
            );
        }
    }, [existingAccount]);

    useEffect(() => {
        // Get user type and supabaseId from Realm
        const users = getAllObjects('User');
        if (users.length > 0) {
            setUserType(users[0].userType || 'free');
            setSupabaseUserId(users[0].supabaseId || null);
        }
    }, []);

    const termOptions = [
        {code: 'cash_in_out', display: t('terms.cash_inCashOut')},
        {code: 'debit_credit', display: t('terms.debitCredit')},
        {code: 'receive_send', display: t('terms.receiveSendOut')},
        {code: 'borrow_lend', display: t('terms.borrowLend')}
    ];

    const getTranslatedTerm = (typeCode) => {
        const term = termOptions.find(t => t.code === typeCode);
        return term ? term.display : t('terms.cash_inCashOut');
    };

    const handleAddAccount = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const now = new Date();
            const users = getAllObjects('User');
            let currentUserId = users.length > 0 ? users[0].id : 'localUser';
            const accounts = getAllObjects('Account');
            const isFirstAccount = accounts.length === 0;

            // Parse initial amount, default to 0 if not entered or invalid
            let parsedInitialAmount = 0;
            if (initialAmount && !isNaN(Number(initialAmount))) {
                parsedInitialAmount = Number(initialAmount);
            }

            // Only set isPrimary true if first account and not editing
            let isPrimaryValue = false;
            if (!existingAccount && isFirstAccount) {
                isPrimaryValue = true;
            } else if (existingAccount) {
                isPrimaryValue = existingAccount.isPrimary;
            }

            let data = {
                // id will be set below
                name: accountName.trim(),
                currency: currency,
                type: terms,
                userId: currentUserId,
                isPrimary: isPrimaryValue,
                currentBalance: existingAccount ? existingAccount.currentBalance : 0,
                language: i18n.language,
                cash_in: existingAccount ? existingAccount.cash_in : 0,
                cash_out: existingAccount ? existingAccount.cash_out : 0,
                debit: existingAccount ? existingAccount.debit : 0,
                credit: existingAccount ? existingAccount.credit : 0,
                receive: existingAccount ? existingAccount.receive : 0,
                send_out: existingAccount ? existingAccount.send_out : 0,
                borrow: existingAccount ? existingAccount.borrow : 0,
                lend: existingAccount ? existingAccount.lend : 0,
                isActive: true,
                createdOn: existingAccount ? existingAccount.createdOn : now,
                updatedOn: now,
                syncStatus: 'pending',
                needsUpload: true,
                initial_amount: parsedInitialAmount,
            };

            // Ensure a local user profile exists when working offline
            if (users.length === 0) {
                const userData = {
                    id: currentUserId,
                    firstName: null,
                    lastName: null,
                    email: null,
                    emailConfirmed: false,
                    biometricEnabled: false,
                    pinEnabled: false,
                    pinCode: null,
                    language: null,
                    passwordHash: null,
                    userType: 'free',
                    profilePictureUrl: null,
                    timezone: null,
                    isActive: true,
                    lastLoginAt: null,
                    createdOn: now,
                    updatedOn: now,
                    syncStatus: 'pending',
                    lastSyncAt: null,
                    needsUpload: true,
                };
                createObject('User', userData);
            }

            // Check network status
            const netState = await NetInfo.fetch();
            const isOnline = netState.isConnected && netState.isInternetReachable;

            // --- PAID USER + ONLINE: Always use Supabase, then save response in Realm ---
            if (userType === 'paid' && isOnline) {
                if (!supabaseUserId) throw new Error('Supabase user ID missing.');

                if (existingAccount) {
                    // Update in Supabase
                    const supabaseAccountId = existingAccount.id;
                    const supabaseResult = await updateAccountInSupabase(supabaseAccountId, {
                        ...data,
                        userId: supabaseUserId
                    });
                    // Save Supabase response in Realm (update)
                    updateObject('Account', supabaseAccountId, {
                        ...supabaseResult,
                        id: supabaseResult.id,
                        userId: supabaseUserId,
                        isPrimary: typeof supabaseResult.is_primary !== 'undefined'
                            ? !!supabaseResult.is_primary
                            : (typeof supabaseResult.isPrimary !== 'undefined'
                                ? !!supabaseResult.isPrimary
                                : !!data.isPrimary),
                        syncStatus: 'synced',
                        needsUpload: false,
                        updatedOn: new Date(),
                        // Ensure currentBalance is set
                        currentBalance: typeof supabaseResult.current_balance !== 'undefined'
                            ? supabaseResult.current_balance
                            : (typeof supabaseResult.currentBalance !== 'undefined'
                                ? supabaseResult.currentBalance
                                : (typeof data.currentBalance !== 'undefined'
                                    ? data.currentBalance
                                    : parsedInitialAmount)),
                        // Ensure isActive is set
                        isActive: typeof supabaseResult.is_active !== 'undefined'
                            ? supabaseResult.is_active
                            : (typeof supabaseResult.isActive !== 'undefined'
                                ? supabaseResult.isActive
                                : true),
                    });
                    Alert.alert(t('common.success'), t('addNewAccountScreen.success.accountUpdated'));
                } else {
                    // Create in Supabase
                    const supabaseResult = await createAccountInSupabase({
                        ...data,
                        userId: supabaseUserId
                    });
                    // Save Supabase response in Realm (create)
                    createObject('Account', {
                        ...supabaseResult,
                        id: supabaseResult.id,
                        userId: supabaseUserId,
                        isPrimary: typeof supabaseResult.is_primary !== 'undefined'
                            ? !!supabaseResult.is_primary
                            : (typeof supabaseResult.isPrimary !== 'undefined'
                                ? !!supabaseResult.isPrimary
                                : !!data.isPrimary),
                        syncStatus: 'synced',
                        needsUpload: false,
                        createdOn: new Date(supabaseResult.created_on || now),
                        updatedOn: new Date(supabaseResult.updated_on || now),
                        // Ensure currentBalance is set
                        currentBalance: typeof supabaseResult.current_balance !== 'undefined'
                            ? supabaseResult.current_balance
                            : (typeof supabaseResult.currentBalance !== 'undefined'
                                ? supabaseResult.currentBalance
                                : (typeof data.currentBalance !== 'undefined'
                                    ? data.currentBalance
                                    : parsedInitialAmount)),
                        // Ensure isActive is set
                        isActive: typeof supabaseResult.is_active !== 'undefined'
                            ? supabaseResult.is_active
                            : (typeof supabaseResult.isActive !== 'undefined'
                                ? supabaseResult.isActive
                                : true),
                    });
                    Alert.alert(t('common.success'), t('addNewAccountScreen.success.accountAdded'));
                }
            } else {
                // --- FREE USER or OFFLINE: Add to SyncLog as before ---
                if (existingAccount) {
                    updateObject('Account', existingAccount.id, {
                        ...data,
                        id: existingAccount.id,
                        updatedOn: now,
                        syncStatus: 'pending',
                        needsUpload: true,
                    });
                    Alert.alert(t('common.success'), t('addNewAccountScreen.success.accountUpdated'));
                } else {
                    const newId = uuid.v4();
                    createObject('Account', {
                        ...data,
                        id: newId,
                        createdOn: now,
                        updatedOn: now,
                        syncStatus: 'pending',
                        needsUpload: true,
                    });
                    // Create sync log
                    createObject('SyncLog', {
                        id: Date.now().toString() + '_log',
                        userId: currentUserId,
                        tableName: 'accounts',
                        recordId: newId,
                        operation: 'create',
                        status: 'pending',
                        createdOn: new Date(),
                        processedAt: null
                    });
                    Alert.alert(t('common.success'), t('addNewAccountScreen.success.accountAdded'));
                }
            }

            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to create/update account: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    }, [
        isLoading, accountName, currency, terms, initialAmount, existingAccount, navigation,
        userType, supabaseUserId, i18n.language
    ]);

    // Add this function for deleting an account
    const handleDeleteAccount = useCallback(async () => {
        if (!existingAccount) return;
        setIsLoading(true);
        try {
            const netState = await NetInfo.fetch();
            const isOnline = netState.isConnected && netState.isInternetReachable;

            if (userType === 'paid' && isOnline) {
                // Delete from Supabase first
                await deleteAccountInSupabase(existingAccount.id);
                // Delete from Realm (remove the object safely)
                const realmAccounts = getAllObjects('Account');
                const accountObj = realmAccounts.filtered('id == $0', existingAccount.id)[0];
                if (accountObj && accountObj.realm) {
                    accountObj.realm.write(() => {
                        accountObj.realm.delete(accountObj);
                    });
                } else if (accountObj) {
                    // fallback if .realm is not available
                    const RealmLib = require('../realm');
                    if (RealmLib && RealmLib.realm) {
                        RealmLib.realm.write(() => {
                            RealmLib.realm.delete(accountObj);
                        });
                    }
                }
            } else {
                // Remove from Realm and add to SyncLog (offline or free user)
                const realmAccounts = getAllObjects('Account');
                const accountObj = realmAccounts.filtered('id == $0', existingAccount.id)[0];
                if (accountObj && accountObj.realm) {
                    accountObj.realm.write(() => {
                        accountObj.realm.delete(accountObj);
                    });
                } else if (accountObj) {
                    // fallback if .realm is not available
                    const RealmLib = require('../realm');
                    if (RealmLib && RealmLib.realm) {
                        RealmLib.realm.write(() => {
                            RealmLib.realm.delete(accountObj);
                        });
                    }
                }
                createObject('SyncLog', {
                    id: Date.now().toString() + '_log',
                    userId: existingAccount.userId,
                    tableName: 'accounts',
                    recordId: existingAccount.id,
                    operation: 'delete',
                    status: 'pending',
                    createdOn: new Date(),
                    processedAt: null
                });
            }
            Alert.alert(t('common.success'), t('addNewAccountScreen.success.accountDeleted'));
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to delete account: ' + (error?.message || error));
        } finally {
            setIsLoading(false);
        }
    }, [existingAccount, navigation, userType]);

    const BottomSheet = ({ visible, onClose, title, children }) => (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.bottomSheetOverlay}
                onPress={onClose}
                activeOpacity={1}
            >
                <View style={styles.bottomSheet}>
                    <Text style={styles.sheetTitle}>{title}</Text>
                    {children}
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const renderCurrencyItem = ({ item }) => (
        <TouchableOpacity
            style={styles.currencyItem}
            onPress={() => {
                console.log('Selected currency:', item.element);
                setCurrency(item.element);
                setShowCurrencySheet(false);
            }}
        >
            <Text style={styles.currencyCode}>{item.element}</Text>
            <Text style={styles.currencyName}>{item.description}</Text>
        </TouchableOpacity>
    );

    const SettingRow = ({ title, value, onPress, isRequired = false, icon }) => (
        <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.settingContent}>
                <View style={styles.settingLeft}>
                    <Text style={styles.label}>
                        {title} {isRequired && <Text style={styles.required}>*</Text>}
                    </Text>
                    <View style={styles.settingValue}>
                        {icon && <View style={styles.iconContainer}>{icon}</View>}
                        <Text style={styles.sheetOptionText}>{value}</Text>
                    </View>
                </View>
                <Icon name="chevron-right" size={RFValue(24)} color={colors.gray} />
            </View>
        </TouchableOpacity>
    );

    const CurrencyIcon = () => (
        <Text style={styles.currencyFlag}>{currency.flag}</Text>
    );

    // Find the selected currency object
    const selectedCurrency = currencies.find(c => c.element === currency) || { element: 'USD' };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : hp(2.5)} // ~20px
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.flex}>
                        <View style={[styles.header, { paddingHorizontal: wp(4.5) }]}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.goBack()}
                            >
                                <Icon name="arrow-back" size={RFValue(24)} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>{existingAccount ? t('addNewAccountScreen.updateAccount') : t('addNewAccountScreen.addAccount')}</Text>
                            <View style={styles.placeholder} />
                        </View>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{
                                alignItems: 'center',
                                paddingBottom: hp(15), // ~120px
                                marginTop: hp(2.25) // ~18px
                            }}
                        >
                            <View style={[styles.formWrapper, { maxWidth: wp(90), width: '100%' }]}>
                                <AccountNameInput
                                    accountName={accountName}
                                    setAccountName={setAccountName}
                                    t={t}
                                />
                                {/* Initial Amount Field */}
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>
                                        {t('addNewAccountScreen.initialAmount') || 'Initial Amount'}
                                        <Text style={styles.optionalText}> ({t('addNewAccountScreen.optional') || 'optional'})</Text>
                                    </Text>
                                    <TextInput
                                        style={styles.input}
                                        value={initialAmount}
                                        onChangeText={setInitialAmount}
                                        placeholder={t('addNewAccountScreen.placeholders.initialAmount') || 'Enter initial amount'}
                                        placeholderTextColor={colors.gray}
                                        keyboardType="numeric"
                                        returnKeyType="done"
                                    />
                                </View>
                                <View style={styles.settingsContainer}>
                                    <SettingRow
                                        title={t('addNewAccountScreen.currency')}
                                        value={selectedCurrency.element}
                                        onPress={() => setShowCurrencySheet(true)}
                                        isRequired={true}
                                        icon={<CurrencyIcon />}
                                    />
                                    <SettingRow
                                        title={t('addNewAccountScreen.terms')}
                                        value={getTranslatedTerm(terms)}
                                        onPress={() => setShowTermsSheet(true)}
                                        isRequired={true}
                                    />
                                </View>
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.saveButton,
                                            !accountName.trim() && styles.disabledButton
                                        ]}
                                        onPress={handleAddAccount}
                                        disabled={!accountName.trim()}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.buttonText}>{existingAccount ? t('addNewAccountScreen.updateAccount') : t('addNewAccountScreen.addAccount')}</Text>
                                    </TouchableOpacity>
                                    {existingAccount && (
                                        <TouchableOpacity
                                            style={[styles.saveButton, { backgroundColor: colors.error, marginTop: 12 }]}
                                            onPress={handleDeleteAccount}
                                            disabled={isLoading}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.buttonText}>{t('addNewAccountScreen.deleteAccount')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>
                {/* Terms Bottom Sheet */}
                <BottomSheet
                    visible={showTermsSheet}
                    onClose={() => setShowTermsSheet(false)}
                    title={t('addNewAccountScreen.selectTransactionType')}
                >
                    {termOptions.map((option) => (
                        <TouchableOpacity
                            key={option.code}
                            style={[
                                styles.sheetOption,
                                terms === option.code && { backgroundColor: colors.lightGray }
                            ]}
                            onPress={() => {
                                setTerms(option.code);
                                setShowTermsSheet(false);
                            }}
                        >
                            <Text style={[
                                styles.sheetOptionText,
                                terms === option.code && { color: colors.primary, fontFamily: 'Sora-Bold' }
                            ]}>
                                {option.display}
                            </Text>
                            {terms === option.code && (
                                <Icon name="check" size={RFValue(22)} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </BottomSheet>
                {/* Currency Bottom Sheet */}
                <BottomSheet
                    visible={showCurrencySheet}
                    onClose={() => setShowCurrencySheet(false)}
                    title={t('addNewAccountScreen.selectCurrency')}
                >
                    <FlatList
                        data={currencies}
                        renderItem={renderCurrencyItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.currencyList}
                    />
                </BottomSheet>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    flex: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: hp(2),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: RFValue(18),
        fontFamily: 'Sora-Bold',
        color: colors.text,
    },
    placeholder: {
        width: 24,
    },
    formWrapper: {
        width: '100%',
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: wp(4),
        elevation: 2,
        shadowColor: colors.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginBottom: hp(2),
    },
    inputContainer: {
        marginBottom: hp(2),
    },
    label: {
        fontSize: RFValue(14),
        fontFamily: 'Sora-Medium',
        color: colors.text,
        marginBottom: 4,
    },
    required: {
        color: colors.error,
    },
    input: {
        height: hp(12),
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: wp(3),
        fontSize: RFValue(16),
        fontFamily: 'Sora-Regular',
        color: colors.text,
        backgroundColor: colors.white,
    },
    settingsContainer: {
        marginTop: hp(2),
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: hp(2),
    },
    settingRow: {
        paddingVertical: hp(1.5),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    settingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingLeft: {
        flex: 1,
    },
    settingValue: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    iconContainer: {
        marginRight: 8,
    },
    sheetOption: {
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(3),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sheetOptionText: {
        fontSize: RFValue(16),
        fontFamily: 'Sora-Regular',
        color: colors.text,
    },
    currencyItem: {
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(3),
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencyCode: {
        fontSize: RFValue(18),
        fontFamily: 'Sora-Bold',
        color: colors.primary,
        marginRight: 8,
    },
    currencyName: {
        fontSize: RFValue(16),
        fontFamily: 'Sora-Regular',
        color: colors.text,
    },
    currencyFlag: {
        fontSize: RFValue(24),
        marginRight: 8,
    },
    buttonContainer: {
        marginTop: hp(3),
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingVertical: hp(2),
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        backgroundColor: colors.lightGray,
    },
    buttonText: {
        fontSize: RFValue(16),
        fontFamily: 'Sora-Bold',
        color: colors.white,
    },
    bottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: wp(4),
        elevation: 4,
        shadowColor: colors.black,
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sheetTitle: {
        fontSize: RFValue(18),
        fontFamily: 'Sora-Bold',
        color: colors.text,
        marginBottom: hp(2),
    },
    currencyList: {
        paddingBottom: hp(2),
    },
    optionalText: {
        color: colors.gray,
        fontSize: RFValue(12),
        fontFamily: 'Sora-Regular',
    },
});

export default AddAccountScreen;