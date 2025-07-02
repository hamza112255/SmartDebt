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
import { createObject, updateObject, getAllObjects, realm } from '../realm';
import uuid from 'react-native-uuid';
import { useTranslation } from 'react-i18next';
import NetInfo from '@react-native-community/netinfo';
import { createAccountInSupabase, updateAccountInSupabase, deleteAccountInSupabase, transformKeysToCamelCase } from '../supabase';
import StyledTextInput from '../components/shared/StyledTextInput';
import StyledPicker from '../components/shared/StyledPicker';

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
    const [currency, setCurrency] = useState('');
    const [terms, setTerms] = useState('');
    const [showCurrencySheet, setShowCurrencySheet] = useState(false);
    const [showTermsSheet, setShowTermsSheet] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userType, setUserType] = useState('free');
    const [supabaseUserId, setSupabaseUserId] = useState(null);
    const [initialAmount, setInitialAmount] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const currencyElements = getAllObjects('CodeListElement')
            .filtered('codeListName == "currencies" && active == true')
            .sorted('sortOrder');
        
        const currencyData = Array.from(currencyElements).map(c => ({ label: `${c.element} - ${c.description}`, value: c.element }));
        setCurrencies(currencyData);
        
        const listener = () => {
            const updatedCurrencies = getAllObjects('CodeListElement')
                .filtered('codeListName == "currencies" && active == true')
                .sorted('sortOrder');
            setCurrencies(Array.from(updatedCurrencies).map(c => ({ label: `${c.element} - ${c.description}`, value: c.element })));
        };
        
        currencyElements.addListener(listener);
        return () => currencyElements.removeListener(listener);
    }, []);

    const existingAccount = route?.params?.account ?? null;

    useEffect(() => {
        if (existingAccount) {
            setAccountName(existingAccount.name);
            setCurrency(existingAccount.currency || '');
            setTerms(existingAccount.type);
            setInitialAmount(
                typeof existingAccount.initial_amount === 'number'
                    ? existingAccount.initial_amount.toString()
                    : (existingAccount.initial_amount || '').toString()
            );
        }
    }, [existingAccount]);

    useEffect(() => {
        const users = getAllObjects('User');
        if (users.length > 0) {
            setUserType(users[0].userType || 'free');
            setSupabaseUserId(users[0].supabaseId || null);
        }
    }, []);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                existingAccount ? (
                    <TouchableOpacity onPress={handleDeleteAccount} style={{ padding: 8 }}>
                        <Icon name="delete" size={24} color={colors.error} />
                    </TouchableOpacity>
                ) : null
            ),
        });
    }, [navigation, existingAccount]);

    const termOptions = [
        {value: 'cash_in_out', label: t('terms.cash_inCashOut')},
        {value: 'debit_credit', label: t('terms.creditDebit')},
        {value: 'receive_send', label: t('terms.receiveSendOut')},
        {value: 'borrow_lend', label: t('terms.borrowLend')}
    ];

    const getTranslatedTerm = (typeCode) => {
        const term = termOptions.find(t => t.value === typeCode);
        return term ? term.label : t('terms.cash_inCashOut');
    };

    const validateForm = () => {
        const newErrors = {};
        if (!accountName.trim()) {
            newErrors.accountName = t('addNewAccountScreen.errors.nameRequired', 'Account name is required.');
        }
        if (!currency) {
            newErrors.currency = t('addNewAccountScreen.errors.currencyRequired', 'Please select a currency.');
        }
        if (!terms) {
            newErrors.terms = t('addNewAccountScreen.errors.termsRequired', 'Please select an account type.');
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAddAccount = useCallback(async () => {
        if (!validateForm()) {
            return;
        }
        if (isLoading) return;
        setIsLoading(true);

        try {
            const now = new Date();
            const users = getAllObjects('User');
            let currentUserId = users.length > 0 ? users[0].id : 'localUser';
            const accounts = getAllObjects('Account');
            const isFirstAccount = accounts.length === 0;

            let parsedInitialAmount = 0;
            if (initialAmount && !isNaN(Number(initialAmount))) {
                parsedInitialAmount = Number(initialAmount);
            }

            let isPrimaryValue = false;
            if (!existingAccount && isFirstAccount) {
                isPrimaryValue = true;
            } else if (existingAccount) {
                isPrimaryValue = existingAccount.isPrimary;
            }

            let data = {
                name: accountName.trim(),
                currency: currency,
                type: terms,
                userId: currentUserId,
                isPrimary: isPrimaryValue,
                currentBalance: existingAccount ? existingAccount.currentBalance : 0,
                language: i18n.language,
                isActive: true,
                createdOn: existingAccount ? existingAccount.createdOn : now,
                updatedOn: now,
                syncStatus: 'pending',
                needsUpload: true,
                initial_amount: parsedInitialAmount,
            };

            if (users.length === 0) {
                const userData = { id: currentUserId, createdOn: now, updatedOn: now, syncStatus: 'pending', needsUpload: true };
                createObject('User', userData);
            }

            const netState = await NetInfo.fetch();
            const isOnline = netState.isConnected && netState.isInternetReachable;

            if (userType === 'paid' && isOnline) {
                if (!supabaseUserId) throw new Error('Supabase user ID missing.');

                if (existingAccount) {
                    const supabaseResult = await updateAccountInSupabase(existingAccount.id, { ...data, userId: supabaseUserId });
                    const realmData = transformKeysToCamelCase(supabaseResult);
                    updateObject('Account', existingAccount.id, { ...realmData, id: existingAccount.id, userId: supabaseUserId, syncStatus: 'synced', needsUpload: false, updatedOn: new Date(realmData.updatedOn) });
                    Alert.alert(t('common.success'), t('addNewAccountScreen.success.accountUpdated'));
                } else {
                    const supabaseResult = await createAccountInSupabase({ ...data, userId: supabaseUserId });
                    const realmData = transformKeysToCamelCase(supabaseResult);
                    createObject('Account', { ...realmData, id: realmData.id, userId: supabaseUserId, currentBalance: parsedInitialAmount, syncStatus: 'synced', needsUpload: false, createdOn: new Date(realmData.createdOn || now), updatedOn: new Date(realmData.updatedOn || now) });
                    Alert.alert(t('common.success'), t('addNewAccountScreen.success.accountAdded'));
                }
            } else {
                if (existingAccount) {
                    updateObject('Account', existingAccount.id, { ...data, id: existingAccount.id, updatedOn: now, syncStatus: 'pending', needsUpload: true });
                    Alert.alert(t('common.success'), t('addNewAccountScreen.success.accountUpdated'));
                } else {
                    const newId = uuid.v4();
                    createObject('Account', { ...data, id: newId, createdOn: now, updatedOn: now, syncStatus: 'pending', needsUpload: true });
                    createObject('SyncLog', { id: Date.now().toString() + '_log', userId: currentUserId, tableName: 'accounts', recordId: newId, operation: 'create', status: 'pending', createdOn: new Date() });
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

    const handleDeleteAccount = () => {
        if (!existingAccount?.id) return;
        
        Alert.alert(
            t('addNewAccountScreen.deleteTitle'),
            t('addNewAccountScreen.deleteMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const accountId = existingAccount.id;
                            const userId = existingAccount.userId;

                            const netState = await NetInfo.fetch();
                            const isOnline = netState.isConnected && netState.isInternetReachable;

                            if (userType === 'paid' && isOnline) {
                                if (!supabaseUserId) throw new Error('Supabase user ID is not available.');

                                await deleteAccountInSupabase(accountId);

                                // On success, delete from Realm locally
                                realm.write(() => {
                                    const accountToDelete = realm.objectForPrimaryKey('Account', accountId);
                                    if (accountToDelete) {
                                        const transactionsToDelete = realm.objects('Transaction').filtered('accountId == $0', accountId);
                                        realm.delete(transactionsToDelete);
                                        realm.delete(accountToDelete);
                                    }
                                });
                                Alert.alert(t('common.success'), t('addNewAccountScreen.success.accountDeleted', 'Account deleted successfully.'));
                            } else {
                                // FREE or OFFLINE: Fallback to SyncLog
                                realm.write(() => {
                                    const accountToDelete = realm.objectForPrimaryKey('Account', accountId);
                                    if (!accountToDelete) return;

                                    const pendingLogs = realm.objects('SyncLog').filtered('recordId == $0 AND (status == "pending" OR status == "failed")', accountId);
                                    const isNewAndUnsynced = pendingLogs.some(log => log.operation === 'create');

                                    if (isNewAndUnsynced) {
                                        if (pendingLogs.length > 0) realm.delete(pendingLogs);
                                    } else {
                                        const updateLogs = pendingLogs.filtered('operation == "update"');
                                        if (updateLogs.length > 0) realm.delete(updateLogs);
                                        
                                        createObject('SyncLog', {
                                            id: new Date().toISOString() + '_log_del_acc',
                                            userId: userId,
                                            tableName: 'accounts',
                                            recordId: accountId,
                                            operation: 'delete',
                                            status: 'pending',
                                            createdOn: new Date(),
                                        });
                                    }
                                    
                                    const transactionsToDelete = realm.objects('Transaction').filtered('accountId == $0', accountId);
                                    realm.delete(transactionsToDelete);
                                    
                                    realm.delete(accountToDelete);
                                });
                                Alert.alert(t('common.success'), t('addNewAccountScreen.success.accountScheduledForDeletion', 'Account scheduled for deletion.'));
                            }
                            
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert(t('common.error'), `${t('addNewAccountScreen.error.failedToDelete', 'Failed to delete account')}: ${error.message}`);
                        }
                    },
                },
            ]
        );
    };

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
    const selectedCurrency = currencies.find(c => c.value === currency) || { value: 'USD' };

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
                                <StyledTextInput
                                    label={t('addNewAccountScreen.accountName')}
                                    value={accountName}
                                    onChangeText={(text) => {
                                        setAccountName(text);
                                        if (errors.accountName) setErrors(p => ({...p, accountName: null}));
                                    }}
                                    placeholder={t('addNewAccountScreen.placeholders.accountName')}
                                    error={errors.accountName}
                                    icon="account-balance"
                                />
                                <StyledTextInput
                                    label={`${t('addNewAccountScreen.initialAmount')} (${t('addNewAccountScreen.optional')})`}
                                    value={initialAmount}
                                    onChangeText={setInitialAmount}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    icon="attach-money"
                                />
                                <StyledPicker
                                    label={t('addNewAccountScreen.currency')}
                                    items={currencies}
                                    selectedValue={currency}
                                    onValueChange={(value) => {
                                        setCurrency(value);
                                        if (errors.currency) setErrors(p => ({...p, currency: null}));
                                    }}
                                    placeholder={t('addNewAccountScreen.placeholders.selectCurrency', 'Select a currency...')}
                                    error={errors.currency}
                                />
                                <StyledPicker
                                    label={t('addNewAccountScreen.terms')}
                                    items={termOptions}
                                    selectedValue={terms}
                                    onValueChange={(value) => {
                                        setTerms(value);
                                        if (errors.terms) setErrors(p => ({...p, terms: null}));
                                    }}
                                    placeholder={t('addNewAccountScreen.placeholders.selectTerms', 'Select account type...')}
                                    error={errors.terms}
                                />
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.saveButton,
                                            isLoading && styles.disabledButton
                                        ]}
                                        onPress={handleAddAccount}
                                        disabled={isLoading}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.buttonText}>{existingAccount ? t('addNewAccountScreen.updateAccount') : t('addNewAccountScreen.addAccount')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>
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