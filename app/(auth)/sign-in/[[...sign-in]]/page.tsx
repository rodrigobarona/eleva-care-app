"use client";

import React from "react";
import { OAuthStrategy } from "@clerk/types";
import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export default function SignInPage() {
  const { signIn } = useSignIn();

  if (!signIn) return null;

  const signInWith = (strategy: OAuthStrategy) => {
    return signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: "/sign-up/sso-callback",
      redirectUrlComplete: "/",
    });
  };

  return (
    <div className="grid w-full grow items-center px-4 sm:justify-center">
      <SignIn.Root>
        <Clerk.Loading>
          {(isGlobalLoading) => (
            <>
              <SignIn.Step name="start">
                <Card className="w-full sm:w-96">
                  <CardHeader>
                    <CardTitle>Sign in to your account</CardTitle>
                    <CardDescription>
                      Welcome back! Please enter your details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-y-4">
                    <Clerk.Connection name="google" asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        disabled={isGlobalLoading}
                      >
                        <Clerk.Loading scope="provider:google">
                          {(isLoading) =>
                            isLoading ? (
                              <Icons.spinner className="size-4 animate-spin" />
                            ) : (
                              <>
                                <Icons.google className="mr-2 size-4" />
                                Sign in with Google
                              </>
                            )
                          }
                        </Clerk.Loading>
                      </Button>
                    </Clerk.Connection>
                    <p className="flex items-center gap-x-3 text-sm text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                      or
                    </p>
                    <Clerk.Field name="identifier" className="space-y-2">
                      <Clerk.Label asChild>
                        <Label>Email</Label>
                      </Clerk.Label>
                      <Clerk.Input type="email" required asChild>
                        <Input />
                      </Clerk.Input>
                      <Clerk.FieldError className="block text-sm text-destructive" />
                    </Clerk.Field>
                  </CardContent>
                  <CardFooter>
                    <div className="grid w-full gap-y-4">
                      <SignIn.Action submit asChild>
                        <Button disabled={isGlobalLoading}>
                          <Clerk.Loading>
                            {(isLoading) => {
                              return isLoading ? (
                                <Icons.spinner className="size-4 animate-spin" />
                              ) : (
                                "Continue"
                              );
                            }}
                          </Clerk.Loading>
                        </Button>
                      </SignIn.Action>
                      <Button variant="link" size="sm" asChild>
                        <Link href="/sign-up">
                          Don't have an account? Sign up
                        </Link>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </SignIn.Step>

              <SignIn.Step name="verifications">
                <SignIn.Strategy name="email_code">
                  <Card className="w-full sm:w-96">
                    <CardHeader>
                      <CardTitle>Check your email</CardTitle>
                      <CardDescription>
                        We sent a code to <SignIn.SafeIdentifier />.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-y-4">
                      <Clerk.Field name="code" className="space-y-2">
                        <Clerk.Label asChild>
                          <Label>Email code</Label>
                        </Clerk.Label>
                        <Clerk.Input type="text" required asChild>
                          <Input />
                        </Clerk.Input>
                        <Clerk.FieldError className="block text-sm text-destructive" />
                      </Clerk.Field>
                    </CardContent>
                    <CardFooter>
                      <div className="grid w-full gap-y-4">
                        <SignIn.Action submit asChild>
                          <Button disabled={isGlobalLoading}>
                            <Clerk.Loading>
                              {(isLoading) => {
                                return isLoading ? (
                                  <Icons.spinner className="size-4 animate-spin" />
                                ) : (
                                  "Continue"
                                );
                              }}
                            </Clerk.Loading>
                          </Button>
                        </SignIn.Action>
                      </div>
                    </CardFooter>
                  </Card>
                </SignIn.Strategy>

                <SignIn.Strategy name="password">
                  <Card className="w-full sm:w-96">
                    <CardHeader>
                      <CardTitle>Enter your password</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-y-4">
                      <Clerk.Field name="password" className="space-y-2">
                        <Clerk.Label asChild>
                          <Label>Password</Label>
                        </Clerk.Label>
                        <Clerk.Input type="password" required asChild>
                          <Input />
                        </Clerk.Input>
                        <Clerk.FieldError className="block text-sm text-destructive" />
                      </Clerk.Field>
                    </CardContent>
                    <CardFooter>
                      <div className="grid w-full gap-y-4">
                        <SignIn.Action submit asChild>
                          <Button disabled={isGlobalLoading}>
                            <Clerk.Loading>
                              {(isLoading) => {
                                return isLoading ? (
                                  <Icons.spinner className="size-4 animate-spin" />
                                ) : (
                                  "Continue"
                                );
                              }}
                            </Clerk.Loading>
                          </Button>
                        </SignIn.Action>
                        <SignIn.Action navigate="forgot-password" asChild>
                          <Button variant="link" size="sm">
                            Forgot password?
                          </Button>
                        </SignIn.Action>
                      </div>
                    </CardFooter>
                  </Card>
                </SignIn.Strategy>

                <SignIn.Strategy name="reset_password_email_code">
                  <Card className="w-full sm:w-96">
                    <CardHeader>
                      <CardTitle>Check your email</CardTitle>
                      <CardDescription>
                        We sent a code to <SignIn.SafeIdentifier />.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-y-4">
                      <Clerk.Field name="code" className="space-y-2">
                        <Clerk.Label asChild>
                          <Label>Email code</Label>
                        </Clerk.Label>
                        <Clerk.Input type="text" required asChild>
                          <Input />
                        </Clerk.Input>
                        <Clerk.FieldError className="block text-sm text-destructive" />
                      </Clerk.Field>
                    </CardContent>
                    <CardFooter>
                      <div className="grid w-full gap-y-4">
                        <SignIn.Action submit asChild>
                          <Button disabled={isGlobalLoading}>
                            <Clerk.Loading>
                              {(isLoading) => {
                                return isLoading ? (
                                  <Icons.spinner className="size-4 animate-spin" />
                                ) : (
                                  "Continue"
                                );
                              }}
                            </Clerk.Loading>
                          </Button>
                        </SignIn.Action>
                      </div>
                    </CardFooter>
                  </Card>
                </SignIn.Strategy>
              </SignIn.Step>

              <SignIn.Step name="forgot-password">
                <Card className="w-full sm:w-96">
                  <CardHeader>
                    <CardTitle>Forgot your password?</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-y-4">
                    <SignIn.SupportedStrategy
                      name="reset_password_email_code"
                      asChild
                    >
                      <Button>Reset password</Button>
                    </SignIn.SupportedStrategy>
                  </CardContent>
                  <CardFooter>
                    <SignIn.Action navigate="previous" asChild>
                      <Button variant="outline">Go back</Button>
                    </SignIn.Action>
                  </CardFooter>
                </Card>
              </SignIn.Step>

              <SignIn.Step name="reset-password">
                <Card className="w-full sm:w-96">
                  <CardHeader>
                    <CardTitle>Reset your password</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-y-4">
                    <Clerk.Field name="password" className="space-y-2">
                      <Clerk.Label asChild>
                        <Label>New password</Label>
                      </Clerk.Label>
                      <Clerk.Input type="password" required asChild>
                        <Input />
                      </Clerk.Input>
                      <Clerk.FieldError className="block text-sm text-destructive" />
                    </Clerk.Field>
                    <Clerk.Field name="confirmPassword" className="space-y-2">
                      <Clerk.Label asChild>
                        <Label>Confirm password</Label>
                      </Clerk.Label>
                      <Clerk.Input type="password" required asChild>
                        <Input />
                      </Clerk.Input>
                      <Clerk.FieldError className="block text-sm text-destructive" />
                    </Clerk.Field>
                  </CardContent>
                  <CardFooter>
                    <SignIn.Action submit asChild>
                      <Button disabled={isGlobalLoading}>
                        <Clerk.Loading>
                          {(isLoading) => {
                            return isLoading ? (
                              <Icons.spinner className="size-4 animate-spin" />
                            ) : (
                              "Reset password"
                            );
                          }}
                        </Clerk.Loading>
                      </Button>
                    </SignIn.Action>
                  </CardFooter>
                </Card>
              </SignIn.Step>
            </>
          )}
        </Clerk.Loading>
      </SignIn.Root>
    </div>
  );
}
