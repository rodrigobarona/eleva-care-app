"use client";

import React, { useState } from "react";
import { useUser, useOrganizationList } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { createOrganization, isLoaded: isOrgLoaded } = useOrganizationList();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [orgName, setOrgName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [step, setStep] = useState(1);

  if (!isUserLoaded || !isOrgLoaded) {
    return <div>Loading...</div>;
  }

  if (!user) {
    redirect("/sign-in");
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await user?.update({
        firstName,
        lastName,
      });
      setStep(2);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const organization = await createOrganization({ name: orgName });
      if (organization) {
        redirect("/dashboard");
      }
    } catch (error) {
      console.error("Error creating organization:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Welcome!</CardTitle>
          <CardDescription>
            {step === 1
              ? "Let's complete your profile"
              : "Create your organization"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleUpdateProfile}>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <CardFooter className="flex justify-between mt-4">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Update Profile"}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleCreateOrganization}>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
              <CardFooter className="flex justify-between mt-4">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Creating..." : "Create Organization"}
                </Button>
              </CardFooter>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}