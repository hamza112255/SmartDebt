import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import GoogleIcon from 'react-native-vector-icons/AntDesign';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';

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
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!password.trim()) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Navigate to Dashboard on success
            navigation.replace('MainTabs');
        } catch (error) {
            Alert.alert('Login Failed', 'Please check your credentials and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            // Simulate Google Sign In
            await new Promise(resolve => setTimeout(resolve, 1500));
            navigation.replace('Dashboard');
        } catch (error) {
            Alert.alert('Google Sign In Failed', 'Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <Icon name="account-balance-wallet" size={RFValue(48)} color={colors.primary} />
                        </View>
                        <Text style={styles.title}>Welcome to SmartDebt</Text>
                        <Text style={styles.subtitle}>Sign in to manage your debts smartly</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.formContainer}>
                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                                <Icon name="email" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor={colors.gray}
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        if (errors.email) {
                                            setErrors(prev => ({ ...prev, email: null }));
                                        }
                                    }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                                <Icon name="lock" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your password"
                                    placeholderTextColor={colors.gray}
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (errors.password) {
                                            setErrors(prev => ({ ...prev, password: null }));
                                        }
                                    }}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Icon
                                        name={showPassword ? 'visibility' : 'visibility-off'}
                                        size={RFValue(20)}
                                        color={colors.gray}
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                        </View>

                        {/* Forgot Password */}
                        <TouchableOpacity style={styles.forgotPassword}>
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        {/* Sign In Button */}
                        <TouchableOpacity
                            style={[styles.signInButton, isLoading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Text style={styles.buttonText}>Signing In...</Text>
                            ) : (
                                <Text style={styles.buttonText}>Sign In</Text>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Google Sign In */}
                        <TouchableOpacity
                            style={[styles.googleButton, isLoading && styles.buttonDisabled]}
                            onPress={handleGoogleSignIn}
                            disabled={isLoading}
                        >
                            <GoogleIcon name="google" size={RFValue(20)} color={colors.text} />
                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </TouchableOpacity>

                        {/* Sign Up Link */}
                        <View style={styles.signUpContainer}>
                            <Text style={styles.signUpText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                                <Text style={styles.signUpLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: wp(6), // 6% of screen width
        paddingVertical: hp(4), // 4% of screen height
    },
    header: {
        alignItems: 'center',
        marginBottom: hp(5),
    },
    logoContainer: {
        width: wp(20),
        height: wp(20),
        borderRadius: wp(10),
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: hp(3),
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
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: hp(3),
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
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: RFPercentage(2.2),
        fontWeight: '600',
        color: colors.white,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: hp(3),
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        fontSize: RFPercentage(2),
        color: colors.gray,
        marginHorizontal: wp(4),
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        borderRadius: wp(3),
        height: hp(6.5),
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: hp(3),
    },
    googleButtonText: {
        fontSize: RFPercentage(2.2),
        fontWeight: '600',
        color: colors.text,
        marginLeft: wp(2),
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