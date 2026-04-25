import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import SplashLoader from "@/components/SplashLoader";

export default function Index() {
  const { loading, serverUrl, user } = useAuth();

  if (loading) return <SplashLoader />;
  if (!serverUrl) return <Redirect href="/setup" />;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)" />;
}
