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
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { supabase, syncPendingChanges } from '../supabase';
import { realm } from '../realm';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconGoogle from 'react-native-vector-icons/MaterialCommunityIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage } from 'react-native-responsive-fontsize';
import { useTranslation } from 'react-i18next';
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

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncMessage, setSyncMessage] = useState('');
    const [estimatedTime, setEstimatedTime] = useState(0);
    const { t } = useTranslation();

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID', // IMPORTANT: Replace with your actual Web Client ID
            offlineAccess: true,
        });
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert(t('common.error'), t('loginScreen.validation.emailPasswordRequired'),[
                {
                    text: t('common.ok'),
            }]);
            return;
        }

        setIsLoading(true);
        try {
            console.log('[LOGIN] Attempting login for:', email);
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) throw error;

            if (data?.user) {
                console.log('[LOGIN] Success, supabase user ID:', data.user.id);
                
                const realmUsers = realm.objects('User').filtered('email == $0', email);
                if (realmUsers.length > 0) {
                    const realmUser = realmUsers[0];
                    console.log('[LOGIN] Found matching Realm user:', realmUser.id);
                    
                    await realm.write(() => {
                        if (realmUser.supabaseId !== data.user.id) {
                            realmUser.supabaseId = data.user.id;
                            console.log('[LOGIN] Updated supabaseId:', realmUser.supabaseId);
                        }
                    });
                    
                    await handleSync(realmUser.id);
                } else {
                    console.log('[LOGIN] No matching Realm user found');
                }
                
                navigation.replace('MainTabs');
            }
        } catch (error) {
            console.error('[LOGIN] Error:', error);
            let message = error.message;
            if (
                message &&
                message.toLowerCase().includes('invalid login credentials')
            ) {
                message = t('loginScreen.errors.invalidCredentials');
            } else {
                message = message || t('loginScreen.errors.signInFailed');
            }
            Alert.alert(t('common.error'), message,[
                {
                    text: t('common.ok'),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setIsLoading(true);
            await GoogleSignin.hasPlayServices();
            const { idToken } = await GoogleSignin.signIn();

            if (idToken) {
                const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: idToken,
                });

                if (error) throw error;

                if (data.user) {
                    const existingUser = realm.objectForPrimaryKey('User', data.user.id);
                    if (!existingUser) {
                        realm.write(() => {
                            realm.create('User', {
                                id: data.user.id,
                                supabaseId: data.user.id,
                                email: data.user.email,
                                firstName: data.user.user_metadata?.full_name?.split(' ')[0] || '',
                                lastName: data.user.user_metadata?.full_name?.split(' ')[1] || '',
                                language: 'en',
                                pinEnabled: false,
                                biometricEnabled: false,
                                isActive: true,
                                emailConfirmed: true,
                                userType: 'free',
                                createdOn: new Date(),
                                updatedOn: new Date(),
                                syncStatus: 'synced',
                                needsUpload: false,
                            });
                        });
                    }
                    await handleSync(data.user.id);
                    navigation.replace('MainTabs');
                }
            }
        } catch (error) {
            if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
                console.error('Google Sign-In Error:', error);
                Alert.alert(t('common.error'), 'Google Sign-In failed. Please try again.',[
                    {
                        text: t('common.ok'),
                    }
                ]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async (userId) => {
        console.log('[SYNC] Starting sync process for user:', userId);
        setIsSyncing(true);
        setSyncMessage(t('loginScreen.sync.starting', 'Preparing to sync...'));
        setSyncProgress(0);
        setEstimatedTime(0);
        const startTime = Date.now();

        try {
            const onProgress = ({ current, total, tableName }) => {
                const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
                setSyncProgress(percentage);
                
                // Calculate estimated time remaining (in seconds)
                if (current > 0 && total > 0) {
                    const elapsedTime = (Date.now() - startTime) / 1000;
                    const estimatedTotalTime = (elapsedTime / current) * total;
                    const remainingTime = Math.round(estimatedTotalTime - elapsedTime);
                    setEstimatedTime(remainingTime > 0 ? remainingTime : 0);
                }
                
                // Explicitly set the progress message and keep the original record count display
                const progressMsg = t('loginScreen.sync.progress', { 
                    current, 
                    total, 
                    table: tableName || 'records' 
                });
                // Replace template placeholders manually
                setSyncMessage(progressMsg.replace('{{current}}', current)
                                         .replace('{{total}}', total)
                                         .replace('{{table}}', tableName || 'records'));
            };

            const result = await syncPendingChanges(userId, onProgress);
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            if (result.total > 0) {
                const completeMsg = t('loginScreen.sync.complete', { duration });
                setSyncMessage(completeMsg.replace('{{duration}}', duration));
                setSyncProgress(100);
            } else {
                setSyncMessage(t('loginScreen.sync.nothingToSync'));
            }
            setEstimatedTime(0);
            
            await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
            console.error('[SYNC] Sync process failed:', error);
            setSyncMessage(t('loginScreen.sync.error', 'Sync failed. Please try again.'));
            await new Promise(resolve => setTimeout(resolve, 2000));
        } finally {
            console.log('[SYNC] Finalizing sync process');
            setIsSyncing(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Modal
                transparent={true}
                animationType="fade"
                visible={isSyncing}
                onRequestClose={() => {}}
            >
                <View style={styles.modalBackdrop}>
                                    <View style={styles.modalContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.modalText}>{syncMessage}</Text>
                    
                    {estimatedTime > 0 && (
                        <Text style={styles.estimatedTimeText}>
                            {t('loginScreen.sync.estimatedTime', { time: estimatedTime }).replace('{{time}}', estimatedTime)}
                        </Text>
                    )}
                    
                    <View style={styles.syncProgressContainer}>
                        <View style={[styles.syncProgress, { width: `${syncProgress}%` }]} />
                    </View>
                    
                    <Text style={styles.warningText}>
                        {t('loginScreen.sync.warning')}
                    </Text>
                </View>
                </View>
            </Modal>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('loginScreen.title')}</Text>
                        <Text style={styles.subtitle}>{t('loginScreen.subtitle')}</Text>
                    </View>
                    <View style={styles.formContainer}>
                        <StyledTextInput
                            label={t('loginScreen.emailLabel')}
                            value={email}
                            onChangeText={setEmail}
                            placeholder={t('loginScreen.placeholders.email', 'Enter your email')}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            icon="email"
                        />
                        <StyledTextInput
                            label={t('loginScreen.passwordLabel')}
                            value={password}
                            onChangeText={setPassword}
                            placeholder={t('loginScreen.placeholders.password', 'Enter your password')}
                            isPassword
                            icon="lock"
                        />
                        <TouchableOpacity style={styles.forgotPasswordButton}>
                            <Text style={styles.forgotPasswordText}>{t('loginScreen.forgotPassword')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.signInButton, (isLoading || isSyncing) && styles.buttonDisabled]} onPress={handleLogin} disabled={isLoading || isSyncing}>
                            {isLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>{t('loginScreen.signInButton')}</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.googleButton, (isLoading || isSyncing) && styles.buttonDisabled]} onPress={handleGoogleSignIn} disabled={isLoading || isSyncing}>
                            <IconGoogle name="google" size={20} color={colors.white} style={styles.googleIcon} />
                            <Text style={styles.buttonText}>{t('loginScreen.googleSignInButton', 'Sign In with Google')}</Text>
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
        marginBottom: hp(2),
    },
    googleButton: {
        backgroundColor: '#db4437',
        borderRadius: wp(3),
        height: hp(6.5),
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        marginBottom: hp(3),
    },
    googleIcon: {
        marginRight: wp(3),
    },
    buttonDisabled: {
        opacity: 0.7,
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
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: colors.white,
        borderRadius: wp(4),
        padding: wp(6),
        alignItems: 'center',
        width: '80%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalText: {
        marginTop: hp(2),
        marginBottom: hp(0.5),
        fontSize: RFPercentage(2.2),
        color: colors.text,
        textAlign: 'center',
    },
    syncProgressContainer: {
        height: 8,
        width: '100%',
        borderRadius: 4,
        backgroundColor: colors.lightGray,
        overflow: 'hidden',
        marginTop: hp(1.5),
    },
    syncProgress: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4,
    },
    estimatedTimeText: {
        fontSize: RFPercentage(1.8),
        color: colors.secondary,
        textAlign: 'center',
        marginBottom: hp(1.5),
        fontStyle: 'italic',
    },
    warningText: {
        fontSize: RFPercentage(1.8),
        color: colors.error,
        textAlign: 'center',
        fontWeight: '600',
        marginTop: hp(2),
        letterSpacing: 0.2,
    },
});

export default LoginScreen;