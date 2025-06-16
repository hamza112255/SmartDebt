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

const SignupScreen = ({ navigation }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Full name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.password.trim()) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Password must contain uppercase, lowercase and number';
        }

        if (!formData.confirmPassword.trim()) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSignup = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            Alert.alert(
                'Account Created Successfully!',
                'Welcome to SmartDebt. You can now sign in with your credentials.',
                [
                    {
                        text: 'Sign In',
                        onPress: () => navigation.navigate('Login'),
                    },
                ]
            );
        } catch (error) {
            Alert.alert('Signup Failed', 'Please try again later.');
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
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join SmartDebt and take control of your finances</Text>
                    </View>
                    <View style={styles.formContainer}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                                <Icon name="person" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your full name"
                                    placeholderTextColor={colors.gray}
                                    value={formData.name}
                                    onChangeText={(text) => updateFormData('name', text)}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                />
                            </View>
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                                <Icon name="email" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor={colors.gray}
                                    value={formData.email}
                                    onChangeText={(text) => updateFormData('email', text)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                                <Icon name="lock" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Create a strong password"
                                    placeholderTextColor={colors.gray}
                                    value={formData.password}
                                    onChangeText={(text) => updateFormData('password', text)}
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
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                                <Icon name="lock" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm your password"
                                    placeholderTextColor={colors.gray}
                                    value={formData.confirmPassword}
                                    onChangeText={(text) => updateFormData('confirmPassword', text)}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Icon
                                        name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                                        size={RFValue(20)}
                                        color={colors.gray}
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                        </View>
                        <View style={styles.passwordRequirements}>
                            <Text style={styles.requirementsTitle}>Password must contain:</Text>
                            <Text style={styles.requirementItem}>• At least 8 characters</Text>
                            <Text style={styles.requirementItem}>• One uppercase letter</Text>
                            <Text style={styles.requirementItem}>• One lowercase letter</Text>
                            <Text style={styles.requirementItem}>• One number</Text>
                        </View>
                        <View style={styles.termsContainer}>
                            <Text style={styles.termsText}>
                                By creating an account, you agree to our{' '}
                                <Text style={styles.termsLink}>Terms of Service</Text>
                                {' '}and{' '}
                                <Text style={styles.termsLink}>Privacy Policy</Text>
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.signUpButton, isLoading && styles.buttonDisabled]}
                            onPress={handleSignup}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Text style={styles.buttonText}>Creating Account...</Text>
                            ) : (
                                <Text style={styles.buttonText}>Create Account</Text>
                            )}
                        </TouchableOpacity>
                        <View style={styles.signInContainer}>
                            <Text style={styles.signInText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.signInLink}>Sign In</Text>
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