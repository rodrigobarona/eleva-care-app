import React from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  return <AuthenticateWithRedirectCallback />;
}
