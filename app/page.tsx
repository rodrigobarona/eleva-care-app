import React from "react";
import { Button } from "@/components/ui/button";
import {
  RegisterLink,
  LoginLink,
} from "@kinde-oss/kinde-auth-nextjs/components";

export default function HomePage() {
  return (
    <div className="text-center container py-4 mx-auto">
      <h1 className="text-3xl mb-6">Eleva Care</h1>
      <div className="flex gap-2 justify-center">
        <Button asChild>
          <LoginLink postLoginRedirectURL="/dashboard">Sign in</LoginLink>
        </Button>
        <Button asChild>
          <RegisterLink postLoginRedirectURL="/welcome">Register</RegisterLink>
        </Button>
      </div>
    </div>
  );
}
