import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, query, collection, where, limit, getDocs } from 'firebase/firestore';

interface FarmerProfile {
  name: string;
  phone: string;
  village: string;
  deviceId: string;
}

interface FarmerProfileContextType {
  profile: FarmerProfile | null;
  loading: boolean;
  hasOnboarded: boolean;
  saveProfile: (name: string, phone: string, village: string) => Promise<void>;
  updateProfile: (updates: { name: string; phone: string; village: string }) => Promise<void>;
  clearProfile: () => Promise<void>;
}

const FarmerProfileContext = createContext<FarmerProfileContextType>({
  profile: null,
  loading: true,
  hasOnboarded: false,
  saveProfile: async () => {},
  updateProfile: async () => {},
  clearProfile: async () => {},
});

export const FarmerProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem('farmer-profile');
        if (stored) {
          setProfile(JSON.parse(stored));
          setHasOnboarded(true);
        }
      } catch (e) {
        console.error('Failed to load farmer profile', e);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const saveProfile = async (name: string, phone: string, village: string) => {
    setLoading(true);
    try {
      const normalizedPhone = phone.replace(/\D/g, '');
      const isRegistration = name.trim() !== "" || village.trim() !== "";

      // Check if user exists by phone
      const q = query(collection(db, 'farmers'), where('phone', '==', normalizedPhone), limit(1));
      const querySnap = await getDocs(q);
      
      let deviceId = profile?.deviceId || `device-${Date.now()}`;
      let finalName = name;
      let finalVillage = village;

      if (!querySnap.empty) {
        const existingDoc = querySnap.docs[0];
        if (isRegistration && existingDoc.id !== profile?.deviceId) {
          throw new Error('PHONE_ALREADY_REGISTERED');
        }
        deviceId = existingDoc.id;
        finalName = name || existingDoc.data().name;
        finalVillage = village || existingDoc.data().village;
      } else {
        // If not registering (name/village are empty) and not found, throw error
        if (!isRegistration) {
          throw new Error('USER_NOT_FOUND');
        }
      }

      const newProfile: FarmerProfile = { name: finalName.trim(), phone: normalizedPhone, village: finalVillage.trim(), deviceId };
      
      // Save locally
      await AsyncStorage.setItem('farmer-profile', JSON.stringify(newProfile));

      const firestoreProfile: Record<string, unknown> = {
        ...newProfile,
        updatedAt: serverTimestamp(),
      };

      if (querySnap.empty) {
        firestoreProfile.joinedAt = serverTimestamp();
      }

      // Save/Update Firestore
      await setDoc(doc(db, 'farmers', deviceId), firestoreProfile, { merge: true });

      setProfile(newProfile);
      setHasOnboarded(true);
    } catch (e) {
      console.error('Login/Save failed', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: { name: string; phone: string; village: string }) => {
    if (!profile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    setLoading(true);
    try {
      const normalizedPhone = updates.phone.replace(/\D/g, '');
      const name = updates.name.trim();
      const village = updates.village.trim();

      const duplicatePhoneQuery = query(collection(db, 'farmers'), where('phone', '==', normalizedPhone), limit(1));
      const duplicatePhoneSnap = await getDocs(duplicatePhoneQuery);
      if (!duplicatePhoneSnap.empty && duplicatePhoneSnap.docs[0].id !== profile.deviceId) {
        throw new Error('PHONE_ALREADY_REGISTERED');
      }

      const nextProfile: FarmerProfile = {
        ...profile,
        name,
        phone: normalizedPhone,
        village,
      };

      await AsyncStorage.setItem('farmer-profile', JSON.stringify(nextProfile));
      await setDoc(doc(db, 'farmers', profile.deviceId), {
        ...nextProfile,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setProfile(nextProfile);
      setHasOnboarded(true);
    } finally {
      setLoading(false);
    }
  };

  const clearProfile = async () => {
    await AsyncStorage.removeItem('farmer-profile');
    setProfile(null);
    setHasOnboarded(false);
  };

  return (
    <FarmerProfileContext.Provider value={{ profile, loading, hasOnboarded, saveProfile, updateProfile, clearProfile }}>
      {children}
    </FarmerProfileContext.Provider>
  );
};

export const useFarmerProfile = () => useContext(FarmerProfileContext);
