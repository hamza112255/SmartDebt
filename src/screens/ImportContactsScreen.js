import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput
} from 'react-native';
import * as Contacts from 'expo-contacts';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Realm from 'realm';
import { realm } from '../realm';
import { useTranslation } from 'react-i18next';
import { createContactInSupabase } from '../supabase';
import NetInfo from '@react-native-community/netinfo';

const colors = {
  primary: '#2563eb',
  background: '#f8fafc',
  white: '#ffffff',
  gray: '#6b7280',
  text: '#1e293b',
  border: '#e5e7eb',
};

const ImportContactsScreen = ({ navigation, route }) => {
  const { userId, onGoBack } = route.params;
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [permissionStatus, setPermissionStatus] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    const getContacts = async () => {
      try {
        const { status } = await Contacts.requestPermissionsAsync();
        setPermissionStatus(status);
        
        if (status === 'granted') {
          const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
          });
          setContacts(data.filter(c => c.firstName));
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getContacts();
  }, []);

  const toggleContactSelection = (contactId) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId) 
        : [...prev, contactId]
    );
  };

  const saveSelectedContacts = async () => {
    if (!selectedContacts.length || !userId) return;

    try {
      const user = realm.objectForPrimaryKey('User', userId);
      const paid = user && (user.isPaid || user.userType === 'paid');
      const netState = await NetInfo.fetch();
      const netOn = netState.isConnected && netState.isInternetReachable;
      const savedContacts = [];

      if (netOn && paid) {
        // Supabase-first for each contact
        for (const contactId of selectedContacts) {
          const contact = contacts.find(c => c.id === contactId);
          if (contact) {
            try {
              const supaContact = await createContactInSupabase({
                id: new Realm.BSON.UUID().toString(),
                name: `${contact.firstName} ${contact.lastName || ''}`.trim(),
                phone: contact.phoneNumbers?.[0]?.number || '',
                email: contact.emails?.[0]?.email || '',
                photoUrl: '',
                userId: user.supabaseId || userId,
                totalOwed: 0,
                totalOwing: 0,
                isActive: true,
                createdOn: new Date(),
                updatedOn: new Date(),
                syncStatus: 'pending',
                lastSyncAt: null,
                needsUpload: true,
              });
              realm.write(() => {
                const newContact = realm.create('Contact', {
                  id: supaContact.id,
                  name: supaContact.name,
                  phone: supaContact.phone,
                  email: supaContact.email,
                  photoUrl: '',
                  userId: user.supabaseId || userId,
                  totalOwed: 0,
                  totalOwing: 0,
                  isActive: true,
                  createdOn: supaContact.created_on ? new Date(supaContact.created_on) : new Date(),
                  updatedOn: supaContact.updated_on ? new Date(supaContact.updated_on) : new Date(),
                  syncStatus: 'synced',
                  lastSyncAt: new Date(),
                  needsUpload: false,
                }, Realm.UpdateMode.Modified);
                savedContacts.push(newContact);
              });
            } catch (err) {
              // Fallback to local + SyncLog if Supabase fails
              realm.write(() => {
                const newContact = realm.create('Contact', {
                  id: new Realm.BSON.UUID().toString(),
                  name: `${contact.firstName} ${contact.lastName || ''}`.trim(),
                  phone: contact.phoneNumbers?.[0]?.number || '',
                  email: contact.emails?.[0]?.email || '',
                  photoUrl: '',
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
                savedContacts.push(newContact);
                realm.create('SyncLog', {
                  id: Date.now().toString() + '_' + newContact.id,
                  userId: userId,
                  tableName: 'contacts',
                  recordId: newContact.id,
                  operation: 'create',
                  status: 'pending',
                  createdOn: new Date(),
                  processedAt: null
                });
              });
            }
          }
        }
      } else {
        // Offline or not paid: add to Realm + SyncLog
        realm.write(() => {
          selectedContacts.forEach(contactId => {
            const contact = contacts.find(c => c.id === contactId);
            if (contact) {
              const newContact = realm.create('Contact', {
                id: new Realm.BSON.UUID().toString(),
                name: `${contact.firstName} ${contact.lastName || ''}`.trim(),
                phone: contact.phoneNumbers?.[0]?.number || '',
                email: contact.emails?.[0]?.email || '',
                photoUrl: '',
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
              savedContacts.push(newContact);

              realm.create('SyncLog', {
                id: Date.now().toString() + '_' + newContact.id,
                userId: userId,
                tableName: 'contacts',
                recordId: newContact.id,
                operation: 'create',
                status: 'pending',
                createdOn: new Date(),
                processedAt: null
              });
            }
          });
        });
      }

      if (onGoBack) {
        onGoBack(savedContacts);
      }
      navigation.goBack();
    } catch (err) {
      console.error('Error saving contacts:', err);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    return contacts.filter(contact => {
      const name = `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase();
      const phone = contact.phoneNumbers?.[0]?.number?.toLowerCase() || '';
      const email = contact.emails?.[0]?.email?.toLowerCase() || '';
      return (
        name.includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery) ||
        email.includes(searchQuery)
      );
    });
  }, [contacts, searchQuery]);

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.contactItem,
        selectedContacts.includes(item.id) && styles.selectedContact
      ]}
      onPress={() => toggleContactSelection(item.id)}
    >
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{`${item.firstName} ${item.lastName || ''}`.trim()}</Text>
        {item.phoneNumbers?.[0]?.number && (
          <Text style={styles.contactDetail}>{item.phoneNumbers[0].number}</Text>
        )}
      </View>
      {selectedContacts.includes(item.id) ? (
        <Icon name="check-box" size={RFValue(24)} color={colors.primary} />
      ) : (
        <Icon name="check-box-outline-blank" size={RFValue(24)} color={colors.gray} />
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (permissionStatus !== 'granted') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionText}>{t('importContactsScreen.contactsPermissionRequired')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={RFValue(24)} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('importContactsScreen.importContacts')}</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSelectedContacts}
          disabled={!selectedContacts.length}
        >
          <Text style={styles.saveButtonText}>{t('importContactsScreen.save')} ({selectedContacts.length})</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('importContactsScreen.placeholders.search')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Icon name="search" size={24} color={colors.gray} />
      </View>

      <FlatList
        data={filteredContacts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>{t('importContactsScreen.noContacts')}</Text>
        )}
      />
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
    padding: hp(2),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: wp(4),
  },
  headerTitle: {
    fontSize: RFPercentage(2.5),
    fontFamily: 'Sora-SemiBold',
    color: colors.text,
    flex: 1,
  },
  saveButton: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    backgroundColor: colors.primary,
    borderRadius: wp(2),
  },
  saveButtonText: {
    color: colors.white,
    fontSize: RFPercentage(2),
    fontFamily: 'Sora-SemiBold',
  },
  listContent: {
    paddingBottom: hp(4),
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: hp(2),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedContact: {
    backgroundColor: '#f0f7ff',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: RFPercentage(2.2),
    fontFamily: 'Sora-SemiBold',
    color: colors.text,
    marginBottom: hp(0.5),
  },
  contactDetail: {
    fontSize: RFPercentage(1.8),
    fontFamily: 'Sora-Regular',
    color: colors.gray,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: hp(4),
    fontSize: RFPercentage(2),
    color: colors.gray,
  },
  permissionText: {
    textAlign: 'center',
    margin: hp(4),
    fontSize: RFPercentage(2.2),
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    padding: 8,
    fontSize: 16,
  },
});

export default ImportContactsScreen;
