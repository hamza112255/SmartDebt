import React, { useState, useRef, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import Realm from 'realm';
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

const ContactNameInput = memo(({ contactName, setContactName }) => {
    const textInputRef = useRef(null);

    const handleTextChange = useCallback((text) => {
        setContactName(text);
    }, [setContactName]);

    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>
                Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
                ref={textInputRef}
                style={styles.input}
                value={contactName}
                onChangeText={handleTextChange}
                placeholder="Name"
                placeholderTextColor={colors.gray}
                autoFocus={false}
                returnKeyType="done"
                autoCapitalize="words"
                autoCorrect={false}
                keyboardType="default"
            />
        </View>
    );
});

const SettingRow = ({ title, value, onChangeText, isRequired = false, style }) => {
    const textInputRef = useRef(null);

    const keyboardType =
        title === 'Contact No'
            ? 'phone-pad'
            : title === 'Email Address'
                ? 'email-address'
                : 'default';

    return (
        <View style={[styles.inputContainer, style]}>
            <Text style={styles.label}>
                {title} {isRequired && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
                ref={textInputRef}
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={title}
                placeholderTextColor={colors.gray}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={keyboardType}
                returnKeyType="done"
            />
        </View>
    );
};

const NewContactScreen = ({ navigation, route }) => {
    const { userId } = route.params || {};

    const [contactName, setContactName] = useState('');
    const [contactNo, setContactNo] = useState('');
    const [email, setEmail] = useState('');
    const [homeAddress, setHomeAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [imageUri, setImageUri] = useState(null);

    const handlePickImage = async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (perm.status !== 'granted') {
                alert('Photo library permission is required');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                quality: 0.7,
                allowsEditing: true,
                aspect: [1, 1],
            });
            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
            }
        } catch (e) {
            console.warn('Image pick error', e);
        }
    };

    const handleAddContact = () => {
        if (!contactName.trim() || !userId) {
            alert('Name is required');
            return;
        }

        try {
            realm.write(() => {
                realm.create('Contact', {
                    id: new Realm.BSON.UUID().toString(),
                    name: contactName,
                    phone: contactNo,
                    email: email,
                    photoUrl: imageUri || '',
                    userId,
                    totalOwed: 0,
                    totalOwing: 0,
                    isActive: true,
                    createdOn: new Date(),
                    updatedOn: new Date(),
                    syncStatus: 'pending',
                    lastSyncAt: null,
                    needsUpload: true,
                });
            });
            navigation.goBack();
        } catch (err) {
            console.error('Save contact error', err);
            alert('Failed to save contact');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <View style={[styles.header, { paddingHorizontal: wp(4.5) }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={RFValue(24)} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Contact</Text>
                <View style={styles.placeholder} />
            </View>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? '0' : hp(2.5)} // ~20px
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                        alignItems: 'center',
                        paddingBottom: hp(15) // ~120px
                    }}
                >
                    <View style={[styles.formWrapper, { maxWidth: wp(90), width: '100%' }]}>
                        {/* Image Placeholder Section */}
                        <View style={styles.imageContainer}>
                            <TouchableOpacity style={styles.imagePlaceholder} onPress={handlePickImage}>
                                {imageUri ? (
                                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                                ) : (
                                    <Icon name="camera-alt" size={RFValue(32)} color={colors.gray} />
                                )}
                            </TouchableOpacity>
                        </View>
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
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.saveButton,
                                    !contactName.trim() && styles.disabledButton
                                ]}
                                onPress={handleAddContact}
                                disabled={!contactName.trim()}
                                activeOpacity={0.85}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(2), // ~16px
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderColor: colors.border,
        width: '100%',
    },
    backButton: {
        width: wp(10), // ~40px
        height: wp(10), // ~40px
        borderRadius: wp(5), // ~20px
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: RFPercentage(2.8), // ~20px
        fontFamily: 'Sora-Bold',
        color: colors.primary,
        marginLeft: wp(3), // ~12px
        flex: 1,
        textAlign: 'center',
    },
    placeholder: {
        width: wp(10) // ~40px
    },
    formWrapper: {
        width: wp(90), // 90% of screen width
        paddingHorizontal: wp(4.5), // ~4px
        alignSelf: 'center',
        marginTop: hp(2), // ~16px
    },
    imageContainer: {
        alignItems: 'center',
        paddingVertical: hp(2.5), // ~20px
        backgroundColor: colors.white,
        borderRadius: wp(3.5), // ~14px
        marginBottom: hp(2), // ~16px
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: wp(0), height: wp(0.25) }, // ~2px
    },
    imagePlaceholder: {
        width: wp(20), // ~80px
        height: wp(20), // ~80px
        borderRadius: wp(5), // ~20px
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreview: {
        width: wp(20), // ~80px
        height: wp(20), // ~80px
        borderRadius: wp(5), // ~20px
    },
    inputContainer: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(4), // ~16px
        marginBottom: hp(1.75), // ~14px
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: wp(0), height: wp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
    },
    label: {
        fontSize: RFPercentage(2), // ~14px
        fontFamily: 'Sora-SemiBold',
        color: colors.gray,
        marginBottom: hp(0.75), // ~6px
    },
    required: {
        color: colors.error,
        fontFamily: 'Sora',
        fontSize: RFPercentage(2), // ~14px
    },
    input: {
        backgroundColor: colors.white,
        borderRadius: wp(2), // ~8px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(2.5), // ~10px
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 0,
    },
    buttonContainer: {
        marginTop: hp(2), // ~16px
        marginBottom: hp(3), // ~24px
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(8), // ~32px
        alignItems: 'center',
        width: '100%',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: wp(0), height: wp(0.25) }, // ~2px
    },
    disabledButton: {
        backgroundColor: colors.gray,
        opacity: 0.6,
    },
    buttonText: {
        color: colors.white,
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Bold',
        textAlign: 'center',
    },
});

export default NewContactScreen;