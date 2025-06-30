import React, { useState } from 'react';
import { supabase } from '../supabase';
import { realm } from '../realm';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import StyledTextInput from '../components/shared/StyledTextInput';

const colors = {
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    secondary: '#64748b',
    background: '#f8fafc',
    white: '#ffffff',
    gray: '#6b7280',
    lightGray: '#f3f4f6',
    error: '#dc2626',
    success: '#16a34a',
    text: '#1f2937',
    border: '#e5e7eb',
};

const SignupScreen = ({ navigation }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const { t } = useTranslation(); // Initialize useTranslation

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = t('signupScreen.validation.emailRequired');
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = t('signupScreen.validation.emailInvalid');
        }

        if (!formData.password.trim()) {
            newErrors.password = t('signupScreen.validation.passwordRequired');
        } else if (formData.password.length < 8) {
            newErrors.password = t('signupScreen.validation.passwordMinLength');
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = t('signupScreen.validation.passwordComplexity');
        }

        if (!formData.confirmPassword.trim()) {
            newErrors.confirmPassword = t('signupScreen.validation.confirmPasswordRequired');
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = t('signupScreen.validation.passwordsDoNotMatch');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSignup = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        const { email, password } = formData;

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });
            console.log('Signup response:', data, error);

            if (error) {
                throw error;
            }

            if (data.user) {
                realm.write(() => {
                    realm.create('User', {
                        id: data.user.id,
                        email: data.user.email,
                        userType: 'Premium',
                        emailConfirmed: false,
                        biometricEnabled: false,
                        pinEnabled: false,
                        language: 'en', // default language
                        isActive: true,
                        createdOn: new Date(),
                        updatedOn: new Date(),
                        syncStatus: 'pending',
                        needsUpload: true,
                    });
                });

                Alert.alert(
                    t('signupScreen.success.title'),
                    'Please check your email to confirm your account.',
                    [
                        {
                            text: t('common.ok'),
                            onPress: () => navigation.navigate('Login'),
                        },
                    ]
                );
            }
        } catch (error) {
            Alert.alert(t('signupScreen.errors.signupFailed'), error.message || t('signupScreen.errors.tryAgain'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Icon name="arrow-back" size={RFValue(24)} color={colors.text} />
                        </TouchableOpacity>

                        <View style={styles.logoContainer}>
                            <Icon name="account-balance-wallet" size={RFValue(48)} color={colors.primary} />
                        </View>
                        <Text style={styles.title}>{t('signupScreen.title')}</Text>
                        <Text style={styles.subtitle}>{t('signupScreen.subtitle')}</Text>
                    </View>
                    <View style={styles.formContainer}>
                        <StyledTextInput
                            label={t('signupScreen.emailAddressLabel')}
                            value={formData.email}
                            onChangeText={(text) => updateFormData('email', text)}
                            placeholder={t('signupScreen.placeholders.email')}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            icon="email"
                            error={errors.email}
                        />

                        <StyledTextInput
                            label={t('signupScreen.passwordLabel')}
                            value={formData.password}
                            onChangeText={(text) => updateFormData('password', text)}
                            placeholder={t('signupScreen.placeholders.password')}
                            autoCapitalize="none"
                            icon="lock"
                            isPassword
                            error={errors.password}
                        />

                        <StyledTextInput
                            label={t('signupScreen.confirmPasswordLabel')}
                            value={formData.confirmPassword}
                            onChangeText={(text) => updateFormData('confirmPassword', text)}
                            placeholder={t('signupScreen.placeholders.confirmPassword')}
                            autoCapitalize="none"
                            icon="lock"
                            isPassword
                            error={errors.confirmPassword}
                        />

                        <View style={styles.passwordRequirements}>
                            <Text style={styles.requirementsTitle}>{t('signupScreen.passwordRequirements.title')}</Text>
                            <Text style={styles.requirementItem}>{t('signupScreen.atLeast8Chars')}</Text>
                            <Text style={styles.requirementItem}>{t('signupScreen.oneUppercase')}</Text>
                            <Text style={styles.requirementItem}>{t('signupScreen.oneLowercase')}</Text>
                            <Text style={styles.requirementItem}>{t('signupScreen.oneNumber')}</Text>
                        </View>
                        <View style={styles.termsContainer}>
                            <Text style={styles.termsText}>
                                {t('signupScreen.termsAgreement')}{' '}
                                <Text style={styles.termsLink}>{t('signupScreen.termsOfService')}</Text>
                                {' '}{t('signupScreen.and')}{' '}
                                <Text style={styles.termsLink}>{t('signupScreen.privacyPolicy')}</Text>
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.signUpButton, isLoading && styles.buttonDisabled]}
                            onPress={handleSignup}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Text style={styles.buttonText}>{t('signupScreen.creatingAccount')}</Text>
                            ) : (
                                <Text style={styles.buttonText}>{t('signupScreen.createAccountButton')}</Text>
                            )}
                        </TouchableOpacity>
                        <View style={styles.signInContainer}>
                            <Text style={styles.signInText}>{t('signupScreen.alreadyHaveAccount')}</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.signInLink}>{t('signupScreen.signInLink')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: wp(6), // 6% of screen width
        paddingVertical: hp(2.5), // 2.5% of screen height
    },
    header: {
        alignItemslaught: 'center',
        marginBottom: hp(4),
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: wp(10),
        height: wp(10),
        borderRadius: wp(5),
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: hp(0.25),
        },
        shadowOpacity: 0.1,
        shadowRadius: wp(1),
        elevation: 2,
    },
    logoContainer: {
        width: wp(20),
        height: wp(20),
        borderRadius: wp(10),
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: hp(3),
        marginTop: hp(2.5),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: hp(0.25),
        },
        shadowOpacity: 0.1,
        shadowRadius: wp(2),
        elevation: 4,
    },
    title: {
        fontSize: RFPercentage(3.8),
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: hp(1),
        textAlign: 'center',
    },
    subtitle: {
        fontSize: RFPercentage(2.2),
        color: colors.gray,
        textAlign: 'center',
        lineHeight: hp(3),
    },
    formContainer: {
        backgroundColor: colors.white,
        borderRadius: wp(4),
        padding: wp(6),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: hp(0.25),
        },
        shadowOpacity: 0.1,
        shadowRadius: wp(4),
        elevation: 8,
    },
    inputContainer: {
        marginBottom: hp(2.5),
    },
    label: {
        fontSize: RFPercentage(2),
        fontWeight: '600',
        color: colors.text,
        marginBottom: hp(1),
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.lightGray,
        borderRadius: wp(3),
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: wp(4),
        height: hp(6.5),
    },
    inputError: {
        borderColor: colors.error,
    },
    inputIcon: {
        marginRight: wp(3),
    },
    input: {
        flex: 1,
        fontSize: RFPercentage(2.2),
        color: colors.text,
        height: '100%',
    },
    eyeIcon: {
        padding: wp(1),
    },
    errorText: {
        fontSize: RFPercentage(1.7),
        color: colors.error,
        marginTop: hp(0.5),
    },
    passwordRequirements: {
        backgroundColor: colors.lightGray,
        borderRadius: wp(2),
        padding: wp(3),
        marginBottom: hp(2.5),
    },
    requirementsTitle: {
        fontSize: RFPercentage(1.7),
        fontWeight: '600',
        color: colors.text,
        marginBottom: hp(0.5),
    },
    requirementItem: {
        fontSize: RFPercentage(1.7),
        color: colors.gray,
        lineHeight: hp(2),
    },
    termsContainer: {
        marginBottom: hp(3),
    },
    termsText: {
        fontSize: RFPercentage(1.7),
        color: colors.gray,
        textAlign: 'center',
        lineHeight: hp(2.5),
    },
    termsLink: {
        color: colors.primary,
        fontWeight: '600',
    },
    signUpButton: {
        backgroundColor: colors.primary,
        borderRadius: wp(3),
        height: hp(6.5),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: hp(3),
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: RFPercentage(2.2),
        fontWeight: '600',
        color: colors.white,
    },
    signInContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signInText: {
        fontSize: RFPercentage(2),
        color: colors.gray,
    },
    signInLink: {
        fontSize: RFPercentage(2),
        color: colors.primary,
        fontWeight: '600',
    },
});

export default SignupScreen;