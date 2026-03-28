import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

const resources = {
  en: {
    translation: {
      welcome: "Welcome to Sanjivani",
      tagline: "Your Partner in Livestock Care",
      consult_doctor: "Consult Doctor",
      product_catalog: "Product Catalog",
      medicine_catalog: "Medicine Catalog",
      feed_catalog: "Feed Catalog",
      appointments: "My Appointments",
      settings: "Settings",
      language: "Language",
      stock: "Stock",
      price: "Price",
      mrp: "MRP",
      discount: "Off",
      request_consultation: "Request Consultation",
      describe_issue: "Describe the health issue...",
      submit: "Submit Request",
      cancel: "Cancel",
      loading: "Loading...",
      no_items: "No items available",
      search_placeholder: "Search medicine or feed...",
      all: "All",
      medicine: "Medicine",
      feed: "Feed",
      order_whatsapp: "Order on WhatsApp",
      describe_issue_placeholder: "Describe the issue (e.g., cow has fever)",
      send_to_whatsapp: "Send to WhatsApp",
      hello_name: "Hello, {{name}}! 👋",
      product_details: "Product Details",
      onboarding_title: "Welcome to\nSanjivani Vet Care",
      name_label: "Your Name",
      name_placeholder: "e.g. Jatin Saikia",
      phone_label: "Mobile Number",
      phone_placeholder: "e.g. 9876543210",
      get_started: "Get Started →",
      name_error: "Please enter your name.",
      phone_error: "Please enter a valid 10-digit phone number.",
      generic_error: "Something went wrong. Please try again.",
      no_orders_yet: "No orders yet",
      orders_description: "Your consultations and orders will appear here.",
      low_stock: "Low Stock",
      order_placed: "Order placed! WhatsApp opened.",
      order_via_whatsapp: "Order via WhatsApp",
      item_not_found: "Item not found.",
      unit_label: "Unit",
      orders: "Orders",
      consultations: "Consultations",
      followup_notes: "Doctor's Notes",
      no_consultations_yet: "No consultations yet",
      village_label: "Village / Area",
      village_placeholder: "e.g. Borbari, Guwahati",
      village_error: "Please enter your village or area.",
      meet_our_experts: "Meet Our Experts",
      view_profile: "View Profile",
      qualifications: "Qualifications",
      logout: "Logout",
      logout_confirm: "Are you sure you want to logout?",
      appearance: "Appearance",
      system_theme: "System Theme",
      sign_in: "Sign In",
      register: "Register",
      already_member: "Already a member? Sign In",
      new_here: "New to Sanjivani? Join Us",
      phone_not_found: "Phone number not found. Please register."
    }
  },
  as: {
    translation: {
      welcome: "সঞ্জীৱনলৈ স্বাগতম",
      tagline: "আপোনাৰ পশুধনৰ যতনৰ সঙ্গী",
      consult_doctor: "চিকিৎসকৰ পৰামৰ্শ",
      product_catalog: "সামগ্ৰীৰ তালিকা",
      medicine_catalog: "দৰবৰ তালিকা",
      feed_catalog: "খাদ্যৰ তালিকা",
      appointments: "মোৰ এপইন্টমেন্ট",
      settings: "ছেটিংছ",
      language: "ভাষা",
      stock: "মজুত",
      price: "মূল্য",
      mrp: "MRP",
      discount: "ৰেহাই",
      request_consultation: "পৰামৰ্শ বিচাৰক",
      describe_issue: "স্বাস্থ্যৰ সমস্যা বৰ্ণনা কৰক...",
      submit: "আবেদন জনোৱাক",
      cancel: "বাতিল কৰক",
      loading: "অপেক্ষা কৰক...",
      no_items: "একো পোৱা নগ'ল",
      search_placeholder: "দৰব বা খাদ্য ইয়াত বিচাৰক...",
      all: "সকলো",
      medicine: "দৰব",
      feed: "খাদ্য",
      order_whatsapp: "WhatsApp-ত অৰ্ডাৰ কৰক",
      describe_issue_placeholder: "সমস্যাটো ইয়াত লিখক (যেনে: গৰুৰ জ্বৰ উঠিছে)",
      send_to_whatsapp: "WhatsApp-লৈ পাঠিয়াওক",
      hello_name: "নমস্কাৰ, {{name}}! 👋",
      product_details: "সামগ্ৰীৰ বিৱৰণ",
      onboarding_title: "সঞ্জীৱনলৈ স্বাগতম",
      name_label: "আপোনাৰ নাম",
      name_placeholder: "যেনে: যতীন শইকীয়া",
      phone_label: "মোবাইল নম্বৰ",
      phone_placeholder: "যেনে: 9876543210",
      get_started: "আৰম্ভ কৰক →",
      name_error: "অনুগ্ৰহ কৰি আপোনাৰ নাম লিখক।",
      phone_error: "অনুগ্ৰহ কৰি এটা সঠিক ১০-অংকৰ মোবাইল নম্বৰ লিখক।",
      generic_error: "কিবা সমস্যা হৈছে। অনুগ্ৰহ কৰি আকৌ চেষ্টা কৰক।",
      no_orders_yet: "এতিয়ালৈকে কোনো অৰ্ডাৰ নাই",
      orders_description: "আপোনাৰ পৰামৰ্শ আৰু অৰ্ডাৰসমূহ ইয়াত দেখা যাব।",
      low_stock: "কম মজুত",
      order_placed: "অৰ্ডাৰ হৈ গ'ল! WhatsApp খোলা হৈছে।",
      order_via_whatsapp: "WhatsApp-ত অৰ্ডাৰ কৰক",
      item_not_found: "সামগ্ৰী পোৱা নগ'ল।",
      unit_label: "একক",
      orders: "অৰ্ডাৰসমূহ",
      consultations: "পৰামৰ্শসমূহ",
      followup_notes: "চিকিৎসকৰ পৰামৰ্শ",
      no_consultations_yet: "এতিয়ালৈকে কোনো পৰামৰ্শ নাই",
      village_label: "গাওঁ / অঞ্চলৰ নাম",
      village_placeholder: "যেনে: বৰবাৰী, গুৱাহাটী",
      village_error: "অনুগ্ৰহ কৰি আপোনাৰ গাওঁ বা অঞ্চলৰ নাম লিখক।",
      meet_our_experts: "আমাৰ বিশেষজ্ঞসকলক লগ কৰক",
      view_profile: "বিৱৰণ চাওক",
      qualifications: "অৰ্হতা",
      logout: "লগ-আউট",
      logout_confirm: "আপুনি নিশ্চিতনে?",
      appearance: "চেহেৰা",
      system_theme: "চিস্টেম থিম",
      sign_in: "ছাইন-ইন কৰক",
      register: "ৰেজিস্টাৰ কৰক",
      already_member: "আপুনি এগৰাকী সদস্য নেকি? ছাইন-ইন কৰক",
      new_here: "সঞ্জীৱনত নতুন নেকি? যোগদান কৰক",
      phone_not_found: "এই মোবাইল নম্বৰটো পোৱা নগ’ল। অনুগ্ৰহ কৰি ৰেজিস্টাৰ কৰক।"
    }
  }
};

const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem('user-language');
  if (!savedLanguage) {
    savedLanguage = Localization.getLocales()?.[0]?.languageCode || 'as';
  }

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage || 'as', // Default to Assamese for rural friendliness
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
};

initI18n();

export default i18n;
