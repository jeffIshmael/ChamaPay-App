import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, router } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  useEffect(()=>{
    const checkIfTokenActive = async () =>{
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.push("/auth-screen");
      }
      else{
        router.push("/(tabs)");
      }
    };
    checkIfTokenActive();
  }, []);
  return null;
}
