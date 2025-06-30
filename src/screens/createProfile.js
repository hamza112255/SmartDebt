import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { getAllObjects, createObject, updateObject } from '../realm';
import uuid from 'react-native-uuid';
import { useTranslation } from 'react-i18next';
import { useNetInfo } from '@react-native-community/netinfo';
import { realm } from '../realm';
import { updateUserInSupabase } from '../supabase';
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

export default function CreateProfileScreen({ navigation, route }) {
    const { mode = 'create', initialValues = {}, onSaveKey } = route.params || {}; // mode: 'create' | 'edit'

    const existingUser = (() => {
        const users = realm.objects('User');
        return users.length > 0 ? users[0] : null;
    })();

    const { t, i18n } = useTranslation();
    const netInfo = useNetInfo();

    const [form, setForm] = useState(() => {
        // Initialize with current i18n language
        const initialLanguage = i18n.language;

        return {
            firstName: mode === 'edit' ? initialValues.firstName || '' : existingUser?.firstName || '',
            lastName: mode === 'edit' ? initialValues.lastName || '' : existingUser?.lastName || '',
            email: mode === 'edit' ? initialValues.email || '' : existingUser?.email || '',
            language: initialLanguage
        };
    });

    const [languages, setLanguages] = useState([]);

    useEffect(() => {
        // Fetch languages from Realm
        const languageElements = realm.objects('CodeListElement')
            .filtered('codeListName == "languages" && active == true')
            .sorted('sortOrder');

        setLanguages(Array.from(languageElements));

        // Realm change listener
        const listener = () => {
            const updatedLanguages = realm.objects('CodeListElement')
                .filtered('codeListName == "languages" && active == true')
                .sorted('sortOrder');
            setLanguages(Array.from(updatedLanguages));
        };

        languageElements.addListener(listener);
        return () => languageElements.removeListener(listener);
    }, []);

    const updateField = (field, value) => {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        const { firstName, lastName, email, language } = form;

        // Required field validation
        if (!firstName.trim()) {
            Alert.alert(t('common.error'), t('createProfileScreen.validation.firstNameRequired'));
            return;
        }
        if (!lastName.trim()) {
            Alert.alert(t('common.error'), t('createProfileScreen.validation.lastNameRequired'));
            return;
        }
        if (!email.trim()) {
            Alert.alert(t('common.error'), t('createProfileScreen.validation.emailRequired'));
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            Alert.alert(t('common.error'), t('createProfileScreen.validation.emailInvalid'));
            return;
        }

        try {
            const isPaidUser = existingUser?.userType === 'paid';
            const isOnline = netInfo.isConnected;

            if (mode === 'edit' && isPaidUser && isOnline) {
                // Paid user is online: Update directly to Supabase
                const updatedData = {
                    id: existingUser.id,
                    firstName,
                    lastName,
                    email,
                    language,
                    updatedOn: new Date().toISOString(),
                };

                const updatedSupabaseUser = await updateUserInSupabase(existingUser.supabaseId, updatedData);

                realm.write(() => {
                    existingUser.firstName = updatedSupabaseUser.first_name;
                    existingUser.lastName = updatedSupabaseUser.last_name;
                    existingUser.email = updatedSupabaseUser.email;
                    existingUser.language = updatedSupabaseUser.language;
                    existingUser.updatedOn = new Date(updatedSupabaseUser.updated_on);
                    existingUser.syncStatus = 'synced';
                    existingUser.needsUpload = false;
                    existingUser.lastSyncAt = new Date();
                });
            } else {
                // Free user, or Paid user is offline: Save to Realm and create SyncLog
                await realm.write(() => {
                    if (existingUser && mode === 'edit') {
                        existingUser.firstName = firstName;
                        existingUser.lastName = lastName;
                        existingUser.email = email;
                        existingUser.language = language;
                        existingUser.updatedOn = new Date();
                        existingUser.syncStatus = 'pending';
                        existingUser.needsUpload = true;

                        realm.create('SyncLog', {
                            id: uuid.v4() + '_log',
                            userId: existingUser.id,
                            tableName: 'users',
                            recordId: existingUser.id,
                            operation: 'update',
                            status: 'pending',
                            createdOn: new Date(),
                        });

                    } else {
                        const newUser = realm.create('User', {
                            id: Date.now().toString(),
                            firstName,
                            lastName,
                            email,
                            language,
                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                            userType: 'free',
                            emailConfirmed: false,
                            biometricEnabled: false,
                            pinEnabled: false,
                            pinCode: '',
                            isActive: true,
                            createdOn: new Date(),
                            updatedOn: new Date(),
                            syncStatus: 'pending',
                            lastSyncAt: null,
                            needsUpload: true,
                        });

                        realm.create('SyncLog', {
                            id: uuid.v4() + '_log',
                            userId: newUser.id,
                            tableName: 'users',
                            recordId: newUser.id,
                            operation: 'create',
                            status: 'pending',
                            createdOn: new Date(),
                            processedAt: null
                        });
                    }
                });
            }

            // Only change language after successful save
            if (language !== i18n.language) {
                i18n.changeLanguage(language);
            }

            if (onSaveKey) {
                navigation.goBack();
            } else {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' }],
                });
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert(t('common.error'), t('createProfileScreen.error.saveFailed') + ': ' + error.message);
        }
    };

    const languageOptions = languages.map(lang => ({
        label: lang.description,
        value: lang.element
    }));

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ alignItems: 'center', paddingBottom: hp(7.5) }}
            >
                <View style={[styles.header, { paddingHorizontal: wp(4.5) }]}>
                    {mode === 'edit' && (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="arrow-back" size={RFValue(22)} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.headerTitle}>{mode === 'edit' ? t('createProfileScreen.editTitle') : t('createProfileScreen.createTitle')}</Text>
                </View>
                <View style={[styles.formWrapper, { maxWidth: wp(90), width: '100%' }]}>
                    {/* First Name */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('createProfileScreen.labels.firstName')}</Text>
                        <StyledTextInput
                            value={form.firstName}
                            onChangeText={text => updateField('firstName', text)}
                            placeholder={t('createProfileScreen.placeholders.firstName')}
                            iconName="person-outline"
                            autoCapitalize="words"
                        />
                    </View>
                    {/* Last Name */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('createProfileScreen.labels.lastName')}</Text>
                        <StyledTextInput
                            value={form.lastName}
                            onChangeText={text => updateField('lastName', text)}
                            placeholder={t('createProfileScreen.placeholders.lastName')}
                            iconName="person-outline"
                            autoCapitalize="words"
                        />
                    </View>
                    {/* Email */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('createProfileScreen.labels.email')}</Text>
                        <StyledTextInput
                            value={form.email}
                            onChangeText={text => updateField('email', text)}
                            placeholder={t('createProfileScreen.placeholders.email')}
                            iconName="email"
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>
                    {/* Language */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('createProfileScreen.labels.language')}</Text>
                        <StyledPicker
                            selectedValue={form.language}
                            onValueChange={(itemValue) => updateField('language', itemValue)}
                            items={languageOptions}
                            iconName="language"
                            showSearch={false}
                        />
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
                            <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(2),
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        width: '100%',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: RFPercentage(2.8),
        fontFamily: 'Sora-Bold',
        color: colors.primary,
        flex: 1,
        textAlign: 'center',
    },
    formWrapper: {
        width: '100%',
        alignSelf: 'center',
        marginTop: hp(3),
        paddingHorizontal: wp(4.5),
    },
    inputContainer: {
        marginBottom: hp(2.25),
        width: '100%',
    },
    label: {
        fontSize: RFPercentage(2),
        fontFamily: 'Sora-SemiBold',
        color: colors.gray,
        marginBottom: hp(1),
    },
    buttonContainer: {
        marginTop: hp(1.5),
        marginBottom: hp(3),
        width: '100%',
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: wp(3),
        paddingVertical: hp(1.75),
        paddingHorizontal: wp(8),
        alignItems: 'center',
        width: '100%',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: hp(0.25) },
    },
    saveButtonText: {
        color: colors.white,
        fontSize: RFPercentage(2.2),
        fontFamily: 'Sora-Bold',
        textAlign: 'center',
    },
    backBtn: {
        paddingRight: wp(3),
    },
});