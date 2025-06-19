import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { useTranslation } from 'react-i18next'; // Import useTranslation

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

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { t } = useTranslation(); // Initialize useTranslation

    const handleSignIn = () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert(t('common.error'), t('loginScreen.validation.emailPasswordRequired'));
            return;
        }
        Alert.alert(t('common.success'), t('loginScreen.success.signIn'));
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
                        <Icon name="account-balance-wallet" size={RFValue(48)} color={colors.primary} />
                        <Text style={styles.title}>{t('loginScreen.title')}</Text>
                        <Text style={styles.subtitle}>{t('loginScreen.subtitle')}</Text>
                    </View>
                    <View style={styles.formContainer}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t('loginScreen.emailLabel')}</Text>
                            <View style={styles.inputWrapper}>
                                <Icon name="email" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('loginScreen.emailLabel')}
                                    placeholderTextColor={colors.gray}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t('loginScreen.passwordLabel')}</Text>
                            <View style={styles.inputWrapper}>
                                <Icon name="lock" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('loginScreen.passwordLabel')}
                                    placeholderTextColor={colors.gray}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                            <TouchableOpacity style={styles.forgotPasswordButton}>
                                <Text style={styles.forgotPasswordText}>{t('loginScreen.forgotPassword')}</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
                            <Text style={styles.buttonText}>{t('loginScreen.signInButton')}</Text>
                        </TouchableOpacity>
                        <View style={styles.signUpContainer}>
                            <Text style={styles.signUpText}>{t('loginScreen.noAccountText')}</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                                <Text style={styles.signUpLink}>{t('loginScreen.signUpLink')}</Text>
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
        paddingHorizontal: wp(6),
        paddingVertical: hp(2.5),
    },
    header: {
        alignItems: 'center',
        marginBottom: hp(4),
    },
    title: {
        fontSize: RFPercentage(3.8),
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: hp(1),
    },
    subtitle: {
        fontSize: RFPercentage(2.2),
        color: colors.gray,
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
    inputIcon: {
        marginRight: wp(3),
    },
    input: {
        flex: 1,
        fontSize: RFPercentage(2.2),
        color: colors.text,
        height: '100%',
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginTop: hp(1),
    },
    forgotPasswordText: {
        fontSize: RFPercentage(2),
        color: colors.primary,
        fontWeight: '600',
    },
    signInButton: {
        backgroundColor: colors.primary,
        borderRadius: wp(3),
        height: hp(6.5),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: hp(3),
    },
    buttonText: {
        fontSize: RFPercentage(2.2),
        fontWeight: '600',
        color: colors.white,
    },
    signUpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signUpText: {
        fontSize: RFPercentage(2),
        color: colors.gray,
    },
    signUpLink: {
        fontSize: RFPercentage(2),
        color: colors.primary,
        fontWeight: '600',
    },
});

export default LoginScreen;