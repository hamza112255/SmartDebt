import { useState } from 'react';
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

const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    error: '#dc2626',
    background: '#f8fafc',
    white: '#ffffff',
    gray: '#6b7280',
    lightGray: '#e0e0e0',
    border: '#e5e7eb',
    activeBorder: '#2563eb',
    text: '#1e293b',
};

const ProfileScreen = ({ navigation }) => {
    const [name, setName] = useState('John Doe');
    const [email, setEmail] = useState('john.doe@example.com');
    const [password, setPassword] = useState('********');

    const handleSave = () => {
        Alert.alert('Success', 'Profile updated successfully!');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    alignItems: 'center',
                    paddingBottom: hp(7.5), // ~60px on an 800px height screen
                }}
            >
                <View style={[styles.header, { paddingHorizontal: wp(4.5) }]}>
                    <Text style={styles.headerTitle}>Profile</Text>
                </View>
                <View style={[styles.formWrapper, { maxWidth: wp(90), width: '100%' }]}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Name</Text>
                        <View style={styles.inputWrapper}>
                            <Icon name="person-outline" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your name"
                                placeholderTextColor={colors.gray}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.inputWrapper}>
                            <Icon name="email" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                placeholderTextColor={colors.gray}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputWrapper}>
                            <Icon name="lock-outline" size={RFValue(20)} color={colors.gray} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter your password"
                                placeholderTextColor={colors.gray}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>
                    </View>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
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
        paddingVertical: hp(2), // ~16px on an 800px height screen
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        width: '100%',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: RFPercentage(2.8), // ~20px on a 720px height screen
        fontFamily: 'Sora-Bold',
        color: colors.primary,
        flex: 1,
        textAlign: 'center',
    },
    formWrapper: {
        width: '100%',
        alignSelf: 'center',
        marginTop: hp(3), // ~24px on an 800px height screen
        paddingHorizontal: wp(4.5), // ~18px on a 400px width screen
    },
    inputContainer: {
        marginBottom: hp(2.25), // ~18px on an 800px height screen
        width: '100%',
    },
    label: {
        fontSize: RFPercentage(2), // ~14px on a 720px height screen
        fontFamily: 'Sora-SemiBold',
        color: colors.gray,
        marginBottom: hp(1), // ~8px on an 800px height screen
    },
    inputWrapper: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px on a 400px width screen
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: wp(3), // ~12px on a 400px width screen
    },
    inputIcon: {
        marginRight: wp(3), // ~12px on a 400px width screen
    },
    input: {
        flex: 1,
        paddingVertical: hp(1.75), // ~14px on an 800px height screen
        fontSize: RFPercentage(2.2), // ~16px on a 720px height screen
        fontFamily: 'Sora-Regular',
        color: colors.text,
    },
    buttonContainer: {
        marginTop: hp(1.5), // ~12px on an 800px height screen
        marginBottom: hp(3), // ~24px on an 800px height screen
        width: '100%',
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: wp(3), // ~12px on a 400px width screen
        paddingVertical: hp(1.75), // ~14px on an 800px height screen
        paddingHorizontal: wp(8), // ~32px on a 400px width screen
        alignItems: 'center',
        width: '100%',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
    },
    saveButtonText: {
        color: colors.white,
        fontSize: RFPercentage(2.2), // ~16px on a 720px height screen
        fontFamily: 'Sora-Bold',
        textAlign: 'center',
    },
});

export default ProfileScreen;