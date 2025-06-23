import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { getAllObjects, createObject, updateObject } from '../realm';
import uuid from 'react-native-uuid';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { realm } from '../realm';

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
            await realm.write(() => {
                if (existingUser && mode === 'edit') {
                    existingUser.firstName = firstName;
                    existingUser.lastName = lastName;
                    existingUser.email = email;
                    existingUser.language = language;
                    existingUser.updatedOn = new Date();
                    existingUser.syncStatus = 'pending';
                    existingUser.needsUpload = true;
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
                        id: Date.now().toString() + '_log',
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
                        <View style={styles.inputWrapper}>
                            <Icon name="person-outline" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={form.firstName}
                                onChangeText={text => updateField('firstName', text)}
                                placeholder={t('createProfileScreen.placeholders.firstName')}
                                placeholderTextColor={colors.gray}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>
                    {/* Last Name */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('createProfileScreen.labels.lastName')}</Text>
                        <View style={styles.inputWrapper}>
                            <Icon name="person-outline" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={form.lastName}
                                onChangeText={text => updateField('lastName', text)}
                                placeholder={t('createProfileScreen.placeholders.lastName')}
                                placeholderTextColor={colors.gray}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>
                    {/* Email */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('createProfileScreen.labels.email')}</Text>
                        <View style={styles.inputWrapper}>
                            <Icon name="email" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={form.email}
                                onChangeText={text => updateField('email', text)}
                                placeholder={t('createProfileScreen.placeholders.email')}
                                placeholderTextColor={colors.gray}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>
                    {/* Language */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('createProfileScreen.labels.language')}</Text>
                        <View style={styles.inputWrapper}>
                            <Icon name="language" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                            <Picker
                                selectedValue={form.language}
                                style={pickerStyles.picker}
                                onValueChange={(itemValue) => updateField('language', itemValue)}
                            >
                                {languageOptions.map(lang => (
                                    <Picker.Item label={lang.label} value={lang.value} key={lang.value} />
                                ))}
                            </Picker>
                        </View>
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

const pickerStyles = StyleSheet.create({
    picker: {
        flex: 1,
        height: hp(6.5),
        color: colors.text,
        fontSize: RFPercentage(2.2),
    },
});

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
    inputWrapper: {
        backgroundColor: colors.white,
        borderRadius: wp(3),
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) },
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: wp(3),
    },
    inputIcon: {
        marginRight: wp(3),
    },
    input: {
        flex: 1,
        paddingVertical: hp(1.75),
        fontSize: RFPercentage(2.2),
        fontFamily: 'Sora-Regular',
        color: colors.text,
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