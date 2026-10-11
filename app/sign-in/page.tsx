import { AuthPage } from "@/components/auth-page";
import { isGoogleOAuthConfigured } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return <AuthPage intent="sign-in" googleOAuthEnabled={isGoogleOAuthConfigured()} />;
}
