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
}

const FarmerProfileContext = createContext<FarmerProfileContextType>({
  profile: null,
  loading: true,
  hasOnboarded: false,
  saveProfile: async () => {},
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
      // Check if user exists by phone
      const q = query(collection(db, 'farmers'), where('phone', '==', phone), limit(1));
      const querySnap = await getDocs(q);
      
      let deviceId = `device-${Date.now()}`;
      let finalName = name;
      let finalVillage = village;

      if (!querySnap.empty) {
        const existingDoc = querySnap.docs[0];
        deviceId = existingDoc.id;
        finalName = name || existingDoc.data().name;
        finalVillage = village || existingDoc.data().village;
      } else {
        // If not registering (name/village are empty) and not found, throw error
        if (name === "" && village === "") {
          throw new Error('USER_NOT_FOUND');
        }
      }

      const newProfile: FarmerProfile = { name: finalName, phone, village: finalVillage, deviceId };
      
      // Save locally
      await AsyncStorage.setItem('farmer-profile', JSON.stringify(newProfile));
      
      // Save/Update Firestore
      await setDoc(doc(db, 'farmers', deviceId), {
        ...newProfile,
        joinedAt: serverTimestamp(),
      }, { merge: true });

      setProfile(newProfile);
      setHasOnboarded(true);
    } catch (e) {
      console.error('Login/Save failed', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return (
    <FarmerProfileContext.Provider value={{ profile, loading, hasOnboarded, saveProfile }}>
      {children}
    </FarmerProfileContext.Provider>
  );
};

export const useFarmerProfile = () => useContext(FarmerProfileContext);
