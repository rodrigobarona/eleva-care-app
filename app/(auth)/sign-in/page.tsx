import React from "react";
import {
  RegisterLink,
  LoginLink,
} from "@kinde-oss/kinde-auth-nextjs/components";
import Image from "next/image";
import { Key } from "lucide-react"; // Make sure to install react-icons if not already

const AuthPage: React.FC = () => {
  return (
    <div>
      <div>
        <div>
          {/* Update the logo to use Google's logo or your own brand logo */}
          <Image
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            src="../favicon.ico"
            alt="Logo"
            width={60}
            height={60}
          />
        </div>
        <h1>Custom Sign In</h1>
        <div>
          <LoginLink
            authUrlParams={{
              connection_id:
                process.env.NEXT_PUBLIC_KINDE_CONNECTION_GOOGLE || "",
            }}
          >
            <Key />
            Sign in with Google
          </LoginLink>
        </div>
        <div>
          <span>
            Don&apos;t have an account?{" "}
            <RegisterLink className="btn btn-dark">Create account</RegisterLink>
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
