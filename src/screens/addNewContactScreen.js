import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    TextInput,
    ScrollView,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    error: '#dc2626',
    background: '#f8fafc',
    white: '#ffffff',
    gray: '#6b7280',
    lightGray: '#f3f4f6',
    border: '#e5e7eb',
    text: '#374151',
};

const ContactNameInput = memo(({ contactName, setContactName }) => {
    const textInputRef = useRef(null);

    const handleTextChange = useCallback((text) => {
        setContactName(text);
    }, [setContactName]);

    useEffect(() => {
        console.log('ContactNameInput re-rendered, contactName:', contactName);
    }, [contactName]);

    return (
        <View style={styles.inputContainer}>
            <Text style={styles.settingTitle}>
                Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
                ref={textInputRef}
                style={styles.textInput}
                value={contactName}
                onChangeText={handleTextChange}
                placeholder="Name"
                placeholderTextColor={colors.gray}
                autoFocus={false}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                onFocus={() => console.log('TextInput focused')}
                onBlur={() => console.log('TextInput blurred')}
            />
        </View>
    );
});

const SettingRow = ({ title, value, onChangeText, isRequired = false }) => {
    const textInputRef = useRef(null);

    return (
        <View style={styles.settingRow}>
            <View style={styles.settingContent}>
                <View style={styles.settingLeft}>
                    <Text style={styles.settingTitle}>
                        {title} {isRequired && <Text style={styles.required}>*</Text>}
                    </Text>
                    <TextInput
                        ref={textInputRef}
                        style={styles.inputValue}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={title}
                        placeholderTextColor={colors.gray}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType={title === 'Contact No' ? 'phone-pad' : title === 'Email Address' ? 'email-address' : 'default'}
                        returnKeyType="done"
                        onFocus={() => console.log(`${title} TextInput focused`)}
                        onBlur={() => console.log(`${title} TextInput blurred`)}
                    />
                </View>
            </View>
        </View>
    );
}

const NewContactScreen = ({ navigation }) => {
    const [contactName, setContactName] = useState('');
    const [contactNo, setContactNo] = useState('');
    const [email, setEmail] = useState('');
    const [homeAddress, setHomeAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');

    const handleAddContact = () => {
        if (contactName.trim()) {
            const contactData = {
                name: contactName,
                contactNo,
                email,
                homeAddress,
                postalCode,
                city,
                state,
                country,
            };
            console.log('Contact Data:', contactData);
            navigation.goBack();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Contact</Text>
                <View style={styles.placeholder} />
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.scrollContent}>
                        {/* Image Placeholder Section */}
                        <View style={styles.imageContainer}>
                            <TouchableOpacity style={styles.imagePlaceholder}>
                                <Icon name="camera-alt" size={24} color={colors.gray} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.settingsContainer}>
                            <ContactNameInput
                                contactName={contactName}
                                setContactName={setContactName}
                            />
                            <SettingRow
                                title="Contact No"
                                value={contactNo}
                                onChangeText={setContactNo}
                            />
                            <SettingRow
                                title="Email Address"
                                value={email}
                                onChangeText={setEmail}
                            />
                            <SettingRow
                                title="Home Address"
                                value={homeAddress}
                                onChangeText={setHomeAddress}
                            />
                            <View style={styles.row}>
                                <SettingRow
                                    title="Postal Code"
                                    value={postalCode}
                                    onChangeText={setPostalCode}
                                />
                                <SettingRow
                                    title="City"
                                    value={city}
                                    onChangeText={setCity}
                                />
                            </View>
                            <View style={styles.row}>
                                <SettingRow
                                    title="State"
                                    value={state}
                                    onChangeText={setState}
                                />
                                <SettingRow
                                    title="Country"
                                    value={country}
                                    onChangeText={setCountry}
                                />
                            </View>
                        </View>
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.getStartedButton,
                                    !contactName.trim() && styles.disabledButton
                                ]}
                                onPress={handleAddContact}
                                disabled={!contactName.trim()}
                            >
                                <Text style={styles.buttonText}>Add Contact</Text>
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
    flex: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 18,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
        marginLeft: 16,
    },
    placeholder: {
        width: 40,
    },
    scrollContent: {
        flexGrow: 1,
    },
    settingsContainer: {
        paddingHorizontal: 18,
        paddingTop: 0,
    },
    inputContainer: {
        backgroundColor: colors.white,
        borderRadius: 14,
        paddingVertical: 20,
        paddingHorizontal: 18,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
    },
    settingRow: {
        backgroundColor: colors.white,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 18,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        flex: 1,
    },
    settingContent: {
        flexDirection: 'column',
    },
    settingLeft: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 13,
        color: colors.text,
        fontWeight: '600',
        marginBottom: 8,
    },
    required: {
        color: colors.error,
    },
    inputValue: {
        fontSize: 16,
        color: colors.text,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    textInput: {
        fontSize: 16,
        color: colors.text,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    buttonContainer: {
        paddingHorizontal: 18,
        paddingVertical: 32,
    },
    getStartedButton: {
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 3 },
    },
    disabledButton: {
        backgroundColor: colors.gray,
        opacity: 0.6,
    },
    buttonText: {
        color: colors.white,
        fontSize: 18,
        fontWeight: '700',
    },
    imageContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        backgroundColor: colors.white,
        marginHorizontal: 18,
        borderRadius: 14,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
    },
    imagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default NewContactScreen;